---
name: check
description: Check whether the reMarkable 2 tablet is connected and reachable. Use when the user runs /rm2:check, asks to test the connection to their reMarkable, or when any other rm2 action cannot reach the tablet.
allowed-tools: Bash(sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh:*)
---

Run exactly this, on its own:

```
sh ${CLAUDE_PLUGIN_ROOT}/scripts/tablet.sh check
```

It tries the USB cable first and then, for users who have set it up, Wi-Fi. It prints one line.

## Connected

- `connected: usb`: reply in one line: "Your reMarkable is connected."
- `connected: wifi`: reply in one line: "Your reMarkable is connected over Wi-Fi."

Do not list files or show any technical detail.

## Not connected

If it prints `not connected` or anything else, reply in plain language. Only ever help them connect with the USB cable: never mention Wi-Fi or suggest fixing a Wi-Fi connection. Keep the reply short, friendly and free of jargon. Never mention SSH, IP addresses, curl, commands, errors or developer mode. Reply with:

> I can't see your reMarkable at the moment. Please try these steps:
>
> 1. Plug the reMarkable into this computer with its USB cable.
> 2. Press the button on the top of the reMarkable to wake it up, and unlock it if it asks.
> 3. If it still doesn't work: on the reMarkable, tap the menu, then **Settings**, then **Storage**, and switch on **USB web interface**. You only need to do this once.
>
> Then ask me to check again.

If the user has already tried these steps and it still fails, suggest, one at a time:

1. On the reMarkable, switch **USB web interface** off and then on again (menu, **Settings**, **Storage**).
2. Unplug the cable and plug it back in, or try a different USB port on the computer.
3. Restart the reMarkable: hold the button on the top, choose to restart, then unlock it once it has started up.
