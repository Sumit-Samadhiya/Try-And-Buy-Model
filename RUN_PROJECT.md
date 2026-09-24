# Run SevenShades on Windows

Double-click **START_PROJECT.bat** in the project folder. Keep its window open.
The launcher checks Python and Node, prepares missing dependencies, applies pending
database migrations, starts the backend and frontend, then opens
http://127.0.0.1:3000/home. Press **Enter in the launcher window** to stop both servers.
Use Enter instead of closing the window with X, which may leave child processes running.

First setup needs working **Python 3.12**, **Node.js 18 or newer** (this checkout was
checked with Node 24), and internet if dependencies are missing. Python can be
installed from python.org and Node from nodejs.org. Reopen the launcher after installation.
The launcher also detects the available Codex Python runtime on this machine.
Paths are relative to the launcher, so the folder can be moved; keep the entire project together.

Existing backend packages are validated before reuse. If unavailable, a separate
environment is created under `.runtime/venv`; existing tracked environments are not deleted.
Frontend dependencies use `package-lock.json`. Database records and uploaded images
are retained. Normal Django migrations are applied; back up your database before updating
the project to a version containing data-changing migrations.

This launcher is for local development. It enables Django debug mode and binds to
127.0.0.1. Existing payment settings remain as configured in the environment; it does
not install Razorpay credentials or turn on production SMS. The existing local OTP
behavior remains unchanged.

If startup fails, the window stays open with an error. Logs are in `.runtime/logs`.
If port 3000 or 8000 is occupied, close the earlier server/launcher and retry; the
launcher never kills another program to free a port. If Windows blocks Python,
repair/reinstall Python 3.12 or allow your trusted installation through local policy.

Optional checks from a terminal in the project folder:

```bat
START_PROJECT.bat -CheckOnly
START_PROJECT.bat -NoBrowser
```

`-CheckOnly` prepares/checks dependencies without starting servers or applying migrations.
`-NoBrowser` starts normally without opening a browser tab.
