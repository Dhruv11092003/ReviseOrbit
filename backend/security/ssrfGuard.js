// The customer database feature means our server takes a connection target
// FROM the customer and connects to it. That's a textbook SSRF vector if
// not checked: a malicious "connection string" could point at localhost,
// a cloud metadata endpoint, or an internal service instead of a real
// MongoDB cluster.
//
// Honest limitation up front: this checks hostnames/IPs at "Test & Connect"
// time. It does not re-validate on every single query, so a sufficiently
// sophisticated DNS-rebinding attack (resolve to a public IP during the
// check, then to a private IP moments later) is not fully defeated by
// application code alone — that last mile needs network-level egress
// controls on whatever platform hosts this backend (e.g. blocking the
// outbound path to RFC1918/metadata ranges at the VPC/firewall level).
// This is called out again in docs/SECURITY.md.

const dns = require("dns").promises;
const net = require("net");

const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

// RFC1918 + loopback + link-local + cloud metadata + other reserved ranges.
function isPrivateOrReservedIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
    if (a === 0) return true;
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true; // couldn't parse — treat as unsafe
}

function parseMongoHosts(uri) {
  // Handles both mongodb:// (explicit host list, optional port) and
  // mongodb+srv:// (single hostname, ports/hosts resolved via DNS SRV).
  const match = uri.match(/^mongodb(\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/i);
  if (!match) throw new Error("Unrecognized MongoDB connection string format.");
  const isSrv = Boolean(match[1]);
  const hostPart = match[2];
  const hosts = hostPart.split(",").map((h) => h.split(":")[0]);
  return { isSrv, hosts };
}

async function resolveAllIps(hostname) {
  const results = await dns.lookup(hostname, { all: true });
  return results.map((r) => r.address);
}

/**
 * Throws if the connection string points at localhost, a private/reserved
 * IP range, a cloud metadata endpoint, or an unsupported scheme. Resolves
 * DNS to catch hostnames that merely alias to a private address.
 */
async function assertSafeMongoUri(uri) {
  if (typeof uri !== "string" || !/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error("Connection string must start with mongodb:// or mongodb+srv://");
  }

  const { isSrv, hosts } = parseMongoHosts(uri);

  for (const host of hosts) {
    const lower = host.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(lower) || lower.endsWith(".local")) {
      throw new Error(`Refusing to connect to disallowed host: ${host}`);
    }

    if (net.isIP(host)) {
      if (isPrivateOrReservedIp(host)) {
        throw new Error(`Refusing to connect to a private/reserved IP: ${host}`);
      }
      continue;
    }

    if (isSrv) {
      // mongodb+srv hosts (e.g. Atlas's "cluster0.xxxxx.mongodb.net") are a
      // DNS-SRV alias by design — they normally have NO direct A/AAAA
      // record at all, only SRV and TXT records. Looking up the bare
      // hostname with dns.lookup() is expected to fail here and is not a
      // sign of anything wrong; the real hosts to check are the SRV
      // targets, resolved below.
      let srvRecords;
      try {
        srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
      } catch (err) {
        throw new Error(`Could not resolve SRV record for host: ${host}`);
      }
      if (srvRecords.length === 0) {
        throw new Error(`No SRV records found for host: ${host}`);
      }
      for (const rec of srvRecords) {
        let srvIps;
        try {
          srvIps = await resolveAllIps(rec.name);
        } catch {
          // A single shard target failing to resolve isn't automatically
          // fatal (Atlas topology can shift) — mongoose's own connection
          // attempt will surface a clear error if this becomes a real
          // problem. We only block on addresses we CAN resolve and find
          // to be private/reserved.
          continue;
        }
        for (const ip of srvIps) {
          if (isPrivateOrReservedIp(ip)) {
            throw new Error(`SRV target ${rec.name} resolves to a private/reserved address.`);
          }
        }
      }
    } else {
      // Plain mongodb:// with an explicit host (and usually a port) —
      // this one IS expected to have a direct A/AAAA record.
      let ips;
      try {
        ips = await resolveAllIps(host);
      } catch (err) {
        throw new Error(`Could not resolve host: ${host}`);
      }
      for (const ip of ips) {
        if (isPrivateOrReservedIp(ip)) {
          throw new Error(`Host ${host} resolves to a private/reserved address.`);
        }
      }
    }
  }
}

module.exports = { assertSafeMongoUri, isPrivateOrReservedIp };