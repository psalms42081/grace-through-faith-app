#!/usr/bin/env node
/**
 * kill-port.js <port>
 *
 * Kills any process listening on <port> before the dev server starts.
 * Uses /proc/net/tcp (and tcp6) + /proc/<pid>/fd scanning because
 * lsof / fuser / ss are not installed in this environment.
 *
 * Safe to run even when nothing is listening — exits 0 either way.
 */

const fs = require("fs");
const path = require("path");

const port = parseInt(process.argv[2], 10);
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error("Usage: node kill-port.js <port>");
  process.exit(1);
}

// Convert port to uppercase 4-char hex (as used in /proc/net/tcp)
const hexPort = port.toString(16).toUpperCase().padStart(4, "0");

/**
 * Parse one /proc/net/tcp* file and return the set of socket inodes that
 * are in LISTEN state (0A) on our target port.
 */
function collectInodes(filePath) {
  const inodes = new Set();
  let data;
  try {
    data = fs.readFileSync(filePath, "utf8");
  } catch {
    return inodes; // file may not exist (e.g. no IPv6 support)
  }

  for (const line of data.split("\n").slice(1)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 10) continue;
    const localAddress = cols[1]; // e.g. "0100007F:1F91"
    const state = cols[3];        // "0A" = LISTEN
    const inode = cols[9];
    if (state !== "0A") continue;
    const [, portHex] = localAddress.split(":");
    if (portHex === hexPort) {
      inodes.add(inode);
    }
  }
  return inodes;
}

/**
 * Scan /proc/<pid>/fd/* symlinks and return PIDs whose open file descriptors
 * point to a socket inode in our target set.
 */
function findPids(targetInodes) {
  const pids = new Set();
  let entries;
  try {
    entries = fs.readdirSync("/proc");
  } catch {
    return pids;
  }

  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    const fdDir = `/proc/${entry}/fd`;
    let fds;
    try {
      fds = fs.readdirSync(fdDir);
    } catch {
      continue; // process may have exited or we lack permission
    }
    for (const fd of fds) {
      let link;
      try {
        link = fs.readlinkSync(path.join(fdDir, fd));
      } catch {
        continue;
      }
      // Socket symlinks look like "socket:[<inode>]"
      const m = link.match(/^socket:\[(\d+)\]$/);
      if (m && targetInodes.has(m[1])) {
        pids.add(parseInt(entry, 10));
        break;
      }
    }
  }
  return pids;
}

// Collect inodes from both IPv4 and IPv6 tables
const inodes = new Set([
  ...collectInodes("/proc/net/tcp"),
  ...collectInodes("/proc/net/tcp6"),
]);

if (inodes.size === 0) {
  console.log(`[kill-port] No process listening on port ${port} — nothing to do.`);
  process.exit(0);
}

const pids = findPids(inodes);

if (pids.size === 0) {
  console.log(`[kill-port] Found socket inodes for port ${port} but no matching PID — nothing to kill.`);
  process.exit(0);
}

for (const pid of pids) {
  // Skip ourselves just in case
  if (pid === process.pid) continue;
  console.log(`[kill-port] Killing PID ${pid} (was holding port ${port})`);
  try {
    process.kill(pid, "SIGKILL");
  } catch (e) {
    // ESRCH = already gone; anything else is worth noting but not fatal
    if (e.code !== "ESRCH") {
      console.warn(`[kill-port] Could not kill PID ${pid}: ${e.message}`);
    }
  }
}

// Brief pause so the OS reclaims the port before the new server binds
setTimeout(() => {
  console.log(`[kill-port] Port ${port} cleared.`);
}, 300);
