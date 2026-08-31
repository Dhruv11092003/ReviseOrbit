# Connecting Your MongoDB to ReviseOrbit

ReviseOrbit stores your questions, revision schedule, and account in a
MongoDB database **you** create and control — not on ReviseOrbit's own
servers. This takes about five minutes.

**ReviseOrbit never asks for your MongoDB Atlas account password.** You
only ever provide a connection string for a database user you create
specifically for this.

## 1. Create a MongoDB Atlas account

Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and
sign up (free tier is enough to start).

## 2. Create a cluster

From the Atlas dashboard, click **Build a Database** and choose the free
**M0** tier. Pick any cloud provider/region — it doesn't matter for
ReviseOrbit.

## 3. Create a database user

Under **Database Access**, click **Add New Database User**. Give it a
username and a strong, generated password. This is the credential that
goes into your connection string — it is separate from your Atlas login
password, and it's the only thing ReviseOrbit ever sees.

## 4. Configure network access

Under **Network Access**, add an IP entry. For ReviseOrbit's hosted
backend to reach your cluster, you'll need to allow its outbound IP(s) —
if you don't know them, `0.0.0.0/0` (allow from anywhere) works but is
broader than necessary; check ReviseOrbit's deployment docs for whether
static IPs are published for exactly this purpose.

## 5. Get your connection string

Click **Connect** on your cluster, choose **Drivers**, and copy the
connection string. It looks like:

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Replace `<username>` and `<password>` with the database user you created
in step 3.

## 6. Connect it to ReviseOrbit

1. Open ReviseOrbit and click **Connect Your Database**.
2. Paste your connection string.
3. Click **Test Connection** — ReviseOrbit verifies it can reach your
   cluster before saving anything.
4. Click **Test & Connect** to finish setup.

ReviseOrbit will remember a workspace identifier for your browser so you
don't need to paste the connection string again — but the connection
string itself is encrypted immediately and is never shown back to you or
anyone else after this step.

## What's stored where

| Data | Where it lives |
|---|---|
| Your account (username, password hash) | Your MongoDB |
| Revisions, tasks, schedules | Your MongoDB |
| Your database connection string | ReviseOrbit's servers, encrypted, never displayed again |
| Whether your workspace is active | ReviseOrbit's servers |

## Backups

Because your data lives in your own MongoDB, **you're responsible for
backing it up** — ReviseOrbit does not have a copy to restore from if
your cluster is lost. MongoDB Atlas has built-in backup options
(Atlas → your cluster → Backup) that take a few clicks to enable and are
worth turning on.

## Disconnecting

Settings → Database → Disconnect removes ReviseOrbit's stored connection
to your database. It does **not** delete your MongoDB cluster or any data
in it — it just means ReviseOrbit can no longer reach it until you
reconnect.
