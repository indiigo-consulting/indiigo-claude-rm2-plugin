---
name: check
description: Check whether the reMarkable 2 tablet is connected and reachable over its USB cable. Use when the user runs /rm2:check, asks to test the connection to their reMarkable, or before any other rm2 action fails to reach the tablet.
allowed-tools: Bash(curl:*)
---

The tablet is reached through its USB web interface at `http://10.11.99.1`. Do not use SSH and do not mention SSH, developer mode or passwords to the user.

Run:

```
curl -s --max-time 3 http://10.11.99.1/documents/
```

**If it returns a JSON array**, the tablet is connected. Reply in one line: "Your reMarkable is connected (N items in the top folder)." where N is the number of entries in the array.

**If it fails, times out or returns anything else**, reply that the reMarkable could not be reached, then give these steps in plain language:

1. Connect the reMarkable to this computer with its USB cable.
2. Wake the tablet and unlock it.
3. On the tablet, open Settings, then Storage, and turn on "USB web interface".
4. Run /rm2:check again.
