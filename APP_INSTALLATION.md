# App Installation Approach

## Why ArozOS Uses a Curated List

ArozOS maintains a curated app list because:

1. **Quality Control** - Only tested apps that work well with their system
2. **Better UX** - Pretty icons, detailed descriptions, categories
3. **Sandboxing** - Their apps run in a sandboxed environment with specific permissions
4. **Cross-Platform** - Works across different package managers (apt, yum, etc.)
5. **Reduced Risk** - Avoids malicious or broken packages

## Our Approach: Simple Package Names

We're using **direct package names** instead because:

1. **Flexibility** - Install anything from the repository
2. **Simplicity** - No need to maintain a curated database
3. **Native Integration** - Works directly with `apt` (and future package managers)
4. **Docker Friendly** - Same approach works in containers
5. **Power User Focused** - Users know what they want to install

## Implementation

### Current: APT (Debian/Ubuntu)
- Search: `apt-cache search <query>`
- Install: `apt-get install -y <package>`
- Remove: `apt-get remove -y <package>`
- List installed: Parse `/usr/share/applications/*.desktop`

### Planned: YUM/DNF (RHEL/Fedora/CentOS)
- Search: `yum search <query>` or `dnf search <query>`
- Install: `yum install -y <package>` or `dnf install -y <package>`
- Remove: `yum remove -y <package>` or `dnf remove -y <package>`

### Detection Strategy
The backend will auto-detect which package manager is available:
```typescript
if (which apt-get) use apt
else if (which yum) use yum
else if (which dnf) use dnf
```

## Security Considerations

**Privilege Escalation**: Package installation requires root.

Options:
1. **Run backend as root** (simple, less secure)
2. **Passwordless sudo** for specific commands (moderate security)
3. **PolicyKit** (complex, most secure)

For **Docker deployment**, the container runs as root by default, so no additional configuration needed.

For **native deployment**, we'll document sudo configuration in the deployment guide.
