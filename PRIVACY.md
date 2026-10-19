# Privacy policy: indiigo reMarkable

Last updated: 19 October 2026

This policy covers the indiigo reMarkable plugin for Claude (`indiigo-rm2`), published by indiigo.

## What the plugin does with your data

The plugin runs entirely on your Mac. It reads documents from your reMarkable 2 tablet so that Claude can show and describe them to you.

- **indiigo collects nothing.** The plugin does not send any data to indiigo or to anyone other than your own tablet. It has no analytics, tracking or telemetry.
- **Your tablet.** The plugin connects only to your tablet: over the USB cable at `http://10.11.99.1`, or, if you turn on Wi-Fi, through the SSH host you choose. It only reads folder listings and documents, and never changes anything on the tablet.
- **Claude.** The pages and folder names you ask about are returned to Claude in your conversation. How Anthropic handles your conversations is covered by Anthropic's own terms and privacy policy.
- **Stored on your Mac.**
  - The latest copy of each document you view is kept as a PDF in a temporary folder (`$TMPDIR/indiigo-rm2`) so it can be reused while the document is unchanged. macOS may remove it at any time, and you can delete it yourself.
  - If you turn on Wi-Fi, the SSH host name you choose is saved in the macOS preferences domain `com.indiigo.rm2` until you turn Wi-Fi off (`/indiigo-rm2:wifi off`).
- **Your SSH key.** Over Wi-Fi, macOS's `ssh` uses your existing SSH key to log in to your tablet. The plugin never reads, copies or sends the key.

Nothing leaves your Mac except the requests to your tablet and the results returned to Claude.

## Children

The plugin is not intended for children under 18.

## Changes

Changes to this policy are published in this file, in the plugin's public repository.

## Contact

Questions about this policy: roy@indiigo.com
