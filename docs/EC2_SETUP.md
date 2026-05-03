# EC2 Instance Setup — Manual Configuration Reference

Steps that must be repeated if the EC2 instance (`i-06380d0c9c99f6124`) is ever
replaced. These are **not** automated by `setup-instance.sh` or `deploy-complete.sh`.

For the full deployment walkthrough see `deploy/aws/QUICKSTART.md`.

---

## Install nano

`nano` is not installed by default on Amazon Linux 2023:

```bash
sudo dnf install -y nano
```

---

## Weekly Security Patching

`crontab` is not available on this instance. All scheduled tasks use systemd timers.

### Create the service unit

```bash
sudo tee /etc/systemd/system/security-updates.service > /dev/null << 'EOF'
[Unit]
Description=Weekly security updates
After=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'dnf update --security -y >> /var/log/security-updates.log 2>&1'
EOF
```

### Create the timer unit

Runs every Sunday at 03:00 UTC:

```bash
sudo tee /etc/systemd/system/security-updates.timer > /dev/null << 'EOF'
[Unit]
Description=Weekly security updates timer

[Timer]
OnCalendar=Sun *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

### Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now security-updates.timer
```

### Verify

```bash
sudo systemctl status security-updates.timer
sudo systemctl list-timers security-updates.timer
```

Logs: `/var/log/security-updates.log`

---

## Scheduling Note

`crontab` is not available on this instance. Use systemd timers for all scheduled
tasks (see the security patching example above as the pattern to follow).

---

## Related

- `deploy/aws/QUICKSTART.md` — full deployment guide
- `docs/SSM_ACCESS.md` — connecting to the instance via SSM
- `docs/DATABASE_CONNECTION.md` — database access patterns
