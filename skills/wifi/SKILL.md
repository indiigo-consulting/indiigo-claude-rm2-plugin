---
name: wifi
description: Set up, change or turn off reaching the reMarkable 2 over Wi-Fi, including how to set up SSH key login to the tablet. Use when the user runs /indiigo-rm2:wifi or asks to set up, change or turn off Wi-Fi access to their reMarkable.
argument-hint: "<ssh host, e.g. rm2> | off"
allowed-tools: mcp__plugin_indiigo-rm2_remarkable
---

Wi-Fi access is optional: without it, the plugin works over the USB cable only. It needs SSH key login to the tablet as `root`, and an SSH host for the tablet in `~/.ssh/config`.

## With a host name or `off`

Call the `configure_wifi` tool of the plugin's `remarkable` MCP server with `ssh_host` set to `$ARGUMENTS`, then report the result in one or two plain sentences:

- Saved and reached the tablet: Wi-Fi is set up and is used whenever the cable is not connected. It takes effect straight away.
- Saved but did not reach the tablet: it is saved, but the tablet did not answer. Suggest waking the tablet and checking it is on the same Wi-Fi network, then that `ssh <host>` works in Terminal without asking for a password. If it does not, offer the setup steps below.
- Turned off: the plugin now uses the USB cable only.
- Not a valid host name: ask for the host name exactly as it appears after `Host` in `~/.ssh/config`.

## Without arguments

Call the `check` tool and tell the user whether a Wi-Fi host is set and which one. Then ask whether they already have SSH key login to the tablet: if so, ask for the host name and continue as above; if not, or if they are unsure, walk them through the setup steps below, one step at a time, and finish by calling `configure_wifi` with the host they chose.

## Setting up SSH key login to the tablet

Give these steps in Terminal on the Mac, replacing `<tablet IP>` with the address from step 1:

1. **Find the tablet's password and address.** On the reMarkable, open Settings, then Help, then Copyrights and licenses. At the bottom it shows the SSH password for the `root` user and the tablet's IP addresses; use the Wi-Fi one (not `10.11.99.1`, which is the USB cable). The tablet must be awake and on the same Wi-Fi network as the Mac.
2. **Make an SSH key, if they do not have one.** `ls ~/.ssh/id_ed25519.pub` shows whether one exists; if not, `ssh-keygen -t ed25519` creates one (pressing Enter accepts the defaults).
3. **Copy the key to the tablet.** `ssh-copy-id root@<tablet IP>`, answering `yes` to the fingerprint question and entering the password from step 1.
4. **Give the tablet a host name.** Add to `~/.ssh/config` (create the file if it does not exist):

   ```
   Host rm2
     Hostname <tablet IP>
     User root
   ```

5. **Test it.** `ssh rm2 true` should return without asking for a password.
6. **Tell the plugin.** Call `configure_wifi` with `ssh_host` set to `rm2` (or the name they used).

Tips to mention:

- The tablet's Wi-Fi address can change; a DHCP reservation on the router keeps it fixed. If it changes, update `Hostname` in `~/.ssh/config`.
- A reMarkable software update can change the tablet's SSH host key, and SSH then refuses to connect with a warning about the host identification having changed. Running `ssh-keygen -R <tablet IP>` and then `ssh rm2 true` (answering `yes`) fixes it; an update can also reset the password and remove the copied key, in which case repeat steps 1 and 3.
- SSH gives full access to the tablet as `root`; the plugin only uses it to read documents, but the key should be kept private.
