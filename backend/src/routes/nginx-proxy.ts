import { Router, Request, Response } from 'express';
import axios, { AxiosInstance } from 'axios';

const router = Router();

// NPM Configuration from environment variables
const NPM_HOST = process.env.NPM_HOST || 'http://localhost:81';
const NPM_EMAIL = process.env.NPM_EMAIL || '';
const NPM_PASSWORD = process.env.NPM_PASSWORD || '';

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // max 60 requests per minute

const checkRateLimit = (key: string): boolean => {
    const now = Date.now();
    const requests = rateLimitMap.get(key) || [];

    // Clean old requests
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (validRequests.length >= RATE_LIMIT_MAX) {
        return false;
    }

    validRequests.push(now);
    rateLimitMap.set(key, validRequests);
    return true;
};

// Token management
interface TokenData {
    token: string;
    expires: number;
}

let cachedToken: TokenData | null = null;

/**
 * Authenticates with NPM and returns an axios instance with auth headers
 */
async function getNPMClient(): Promise<AxiosInstance> {
    // Check if we have a valid cached token
    if (cachedToken && cachedToken.expires > Date.now()) {
        return axios.create({
            baseURL: NPM_HOST,
            headers: {
                'Authorization': `Bearer ${cachedToken.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });
    }

    // Need to authenticate
    if (!NPM_EMAIL || !NPM_PASSWORD) {
        throw new Error('NPM credentials not configured. Set NPM_EMAIL and NPM_PASSWORD environment variables.');
    }

    try {
        const response = await axios.post(`${NPM_HOST}/api/tokens`, {
            identity: NPM_EMAIL,
            secret: NPM_PASSWORD
        }, {
            timeout: 10000
        });

        if (!response.data || !response.data.token) {
            throw new Error('Invalid response from NPM authentication');
        }

        // Cache token for 1 hour (NPM tokens typically last 24 hours, but we refresh earlier)
        cachedToken = {
            token: response.data.token,
            expires: Date.now() + 3600000 // 1 hour
        };

        return axios.create({
            baseURL: NPM_HOST,
            headers: {
                'Authorization': `Bearer ${cachedToken.token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    } catch (error: any) {
        console.error('NPM authentication failed:', error.message);
        if (error.response?.status === 401) {
            throw new Error('Invalid NPM credentials');
        }
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Cannot connect to NPM. Check NPM_HOST configuration.');
        }
        throw new Error('NPM authentication failed');
    }
}

/**
 * Validates domain name format
 */
function isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Validates IP address format (IPv4)
 */
function isValidIPv4(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

/**
 * Validates port number
 */
function isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
}

// POST /api/nginx-proxy/login - Test authentication with NPM
router.post('/login', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const client = await getNPMClient();

        // Test the connection by fetching user info
        const response = await client.get('/api/users/me');

        res.json({
            success: true,
            user: response.data,
            message: 'Successfully connected to Nginx Proxy Manager'
        });
    } catch (error: any) {
        console.error('NPM login test failed:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to authenticate with NPM'
        });
    }
});

// GET /api/nginx-proxy/hosts - List all proxy hosts
router.get('/hosts', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const client = await getNPMClient();
        const response = await client.get('/api/nginx/proxy-hosts');

        res.json({ hosts: response.data });
    } catch (error: any) {
        console.error('Failed to list proxy hosts:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to retrieve proxy hosts'
        });
    }
});

// POST /api/nginx-proxy/hosts - Create proxy host
router.post('/hosts', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const {
        domain_names,
        forward_host,
        forward_port,
        certificate_id,
        ssl_forced,
        http2_support,
        block_exploits,
        allow_websocket_upgrade,
        access_list_id,
        advanced_config,
        locations
    } = req.body;

    // Input validation
    if (!domain_names || !Array.isArray(domain_names) || domain_names.length === 0) {
        return res.status(400).json({ error: 'Domain names are required and must be an array' });
    }

    // Validate each domain
    for (const domain of domain_names) {
        if (!isValidDomain(domain)) {
            return res.status(400).json({ error: `Invalid domain name: ${domain}` });
        }
    }

    if (!forward_host || typeof forward_host !== 'string') {
        return res.status(400).json({ error: 'Forward host is required' });
    }

    // Validate forward_host (can be IP or domain)
    if (!isValidDomain(forward_host) && !isValidIPv4(forward_host)) {
        return res.status(400).json({ error: 'Invalid forward host (must be domain or IP)' });
    }

    if (!forward_port || !isValidPort(forward_port)) {
        return res.status(400).json({ error: 'Valid forward port is required (1-65535)' });
    }

    // Sanitize advanced config if provided
    if (advanced_config && typeof advanced_config !== 'string') {
        return res.status(400).json({ error: 'Advanced config must be a string' });
    }

    try {
        const client = await getNPMClient();

        const proxyData = {
            domain_names,
            forward_scheme: 'http',
            forward_host,
            forward_port: parseInt(forward_port, 10),
            certificate_id: certificate_id || 0,
            ssl_forced: ssl_forced === true ? 1 : 0,
            http2_support: http2_support === true ? 1 : 0,
            block_exploits: block_exploits !== false ? 1 : 0, // default true
            allow_websocket_upgrade: allow_websocket_upgrade === true ? 1 : 0,
            access_list_id: access_list_id || 0,
            advanced_config: advanced_config || '',
            locations: locations || [],
            caching_enabled: 0,
            hsts_enabled: 0,
            hsts_subdomains: 0,
            meta: {
                letsencrypt_agree: false,
                dns_challenge: false
            }
        };

        const response = await client.post('/api/nginx/proxy-hosts', proxyData);

        res.status(201).json({
            success: true,
            host: response.data,
            message: 'Proxy host created successfully'
        });
    } catch (error: any) {
        console.error('Failed to create proxy host:', error.message);

        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                error: error.response.data.message
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to create proxy host'
        });
    }
});

// PUT /api/nginx-proxy/hosts/:id - Update proxy host
router.put('/hosts/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid host ID' });
    }

    const {
        domain_names,
        forward_host,
        forward_port,
        certificate_id,
        ssl_forced,
        http2_support,
        block_exploits,
        allow_websocket_upgrade,
        access_list_id,
        advanced_config,
        locations,
        enabled
    } = req.body;

    // Validate provided fields (at least one field must be updated)
    if (domain_names && !Array.isArray(domain_names)) {
        return res.status(400).json({ error: 'Domain names must be an array' });
    }

    if (domain_names) {
        for (const domain of domain_names) {
            if (!isValidDomain(domain)) {
                return res.status(400).json({ error: `Invalid domain name: ${domain}` });
            }
        }
    }

    if (forward_host && (!isValidDomain(forward_host) && !isValidIPv4(forward_host))) {
        return res.status(400).json({ error: 'Invalid forward host' });
    }

    if (forward_port !== undefined && !isValidPort(forward_port)) {
        return res.status(400).json({ error: 'Invalid forward port' });
    }

    try {
        const client = await getNPMClient();

        // First, get the existing host to merge updates
        const existingResponse = await client.get(`/api/nginx/proxy-hosts/${id}`);
        const existingHost = existingResponse.data;

        const updatedData = {
            ...existingHost,
            ...(domain_names && { domain_names }),
            ...(forward_host && { forward_host }),
            ...(forward_port && { forward_port: parseInt(forward_port, 10) }),
            ...(certificate_id !== undefined && { certificate_id }),
            ...(ssl_forced !== undefined && { ssl_forced: ssl_forced ? 1 : 0 }),
            ...(http2_support !== undefined && { http2_support: http2_support ? 1 : 0 }),
            ...(block_exploits !== undefined && { block_exploits: block_exploits ? 1 : 0 }),
            ...(allow_websocket_upgrade !== undefined && { allow_websocket_upgrade: allow_websocket_upgrade ? 1 : 0 }),
            ...(access_list_id !== undefined && { access_list_id }),
            ...(advanced_config !== undefined && { advanced_config }),
            ...(locations && { locations }),
            ...(enabled !== undefined && { enabled: enabled ? 1 : 0 })
        };

        const response = await client.put(`/api/nginx/proxy-hosts/${id}`, updatedData);

        res.json({
            success: true,
            host: response.data,
            message: 'Proxy host updated successfully'
        });
    } catch (error: any) {
        console.error('Failed to update proxy host:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Proxy host not found' });
        }

        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                error: error.response.data.message
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to update proxy host'
        });
    }
});

// DELETE /api/nginx-proxy/hosts/:id - Delete proxy host
router.delete('/hosts/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid host ID' });
    }

    try {
        const client = await getNPMClient();
        await client.delete(`/api/nginx/proxy-hosts/${id}`);

        res.json({
            success: true,
            message: 'Proxy host deleted successfully'
        });
    } catch (error: any) {
        console.error('Failed to delete proxy host:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Proxy host not found' });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to delete proxy host'
        });
    }
});

// GET /api/nginx-proxy/certificates - List SSL certificates
router.get('/certificates', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const client = await getNPMClient();
        const response = await client.get('/api/nginx/certificates');

        res.json({ certificates: response.data });
    } catch (error: any) {
        console.error('Failed to list certificates:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to retrieve certificates'
        });
    }
});

// POST /api/nginx-proxy/certificates - Request new Let's Encrypt certificate
router.post('/certificates', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { domain_names, email, dns_challenge, dns_provider, dns_credentials } = req.body;

    // Input validation
    if (!domain_names || !Array.isArray(domain_names) || domain_names.length === 0) {
        return res.status(400).json({ error: 'Domain names are required and must be an array' });
    }

    for (const domain of domain_names) {
        if (!isValidDomain(domain)) {
            return res.status(400).json({ error: `Invalid domain name: ${domain}` });
        }
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email address is required' });
    }

    try {
        const client = await getNPMClient();

        const certData: any = {
            provider: 'letsencrypt',
            domain_names,
            meta: {
                letsencrypt_email: email,
                letsencrypt_agree: true,
                dns_challenge: dns_challenge === true
            }
        };

        if (dns_challenge && dns_provider) {
            certData.meta.dns_provider = dns_provider;
            if (dns_credentials) {
                certData.meta.dns_provider_credentials = dns_credentials;
            }
        }

        const response = await client.post('/api/nginx/certificates', certData);

        res.status(201).json({
            success: true,
            certificate: response.data,
            message: 'Certificate request submitted successfully'
        });
    } catch (error: any) {
        console.error('Failed to request certificate:', error.message);

        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                error: error.response.data.message
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to request certificate'
        });
    }
});

// DELETE /api/nginx-proxy/certificates/:id - Delete certificate
router.delete('/certificates/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    try {
        const client = await getNPMClient();
        await client.delete(`/api/nginx/certificates/${id}`);

        res.json({
            success: true,
            message: 'Certificate deleted successfully'
        });
    } catch (error: any) {
        console.error('Failed to delete certificate:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to delete certificate'
        });
    }
});

// GET /api/nginx-proxy/redirects - List redirections
router.get('/redirects', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const client = await getNPMClient();
        const response = await client.get('/api/nginx/redirection-hosts');

        res.json({ redirects: response.data });
    } catch (error: any) {
        console.error('Failed to list redirects:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to retrieve redirections'
        });
    }
});

// POST /api/nginx-proxy/redirects - Create redirection
router.post('/redirects', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { domain_names, forward_domain_name, certificate_id, preserve_path } = req.body;

    // Input validation
    if (!domain_names || !Array.isArray(domain_names) || domain_names.length === 0) {
        return res.status(400).json({ error: 'Domain names are required and must be an array' });
    }

    for (const domain of domain_names) {
        if (!isValidDomain(domain)) {
            return res.status(400).json({ error: `Invalid domain name: ${domain}` });
        }
    }

    if (!forward_domain_name || !isValidDomain(forward_domain_name)) {
        return res.status(400).json({ error: 'Valid forward domain name is required' });
    }

    try {
        const client = await getNPMClient();

        const redirectData = {
            domain_names,
            forward_http_code: 301, // Permanent redirect
            forward_scheme: 'https',
            forward_domain_name,
            certificate_id: certificate_id || 0,
            preserve_path: preserve_path !== false, // default true
            block_exploits: 1,
            advanced_config: '',
            meta: {
                letsencrypt_agree: false,
                dns_challenge: false
            }
        };

        const response = await client.post('/api/nginx/redirection-hosts', redirectData);

        res.status(201).json({
            success: true,
            redirect: response.data,
            message: 'Redirection created successfully'
        });
    } catch (error: any) {
        console.error('Failed to create redirect:', error.message);

        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                error: error.response.data.message
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to create redirection'
        });
    }
});

// DELETE /api/nginx-proxy/redirects/:id - Delete redirection
router.delete('/redirects/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid redirect ID' });
    }

    try {
        const client = await getNPMClient();
        await client.delete(`/api/nginx/redirection-hosts/${id}`);

        res.json({
            success: true,
            message: 'Redirection deleted successfully'
        });
    } catch (error: any) {
        console.error('Failed to delete redirect:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Redirection not found' });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to delete redirection'
        });
    }
});

// GET /api/nginx-proxy/streams - List streams
router.get('/streams', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    try {
        const client = await getNPMClient();
        const response = await client.get('/api/nginx/streams');

        res.json({ streams: response.data });
    } catch (error: any) {
        console.error('Failed to list streams:', error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to retrieve streams'
        });
    }
});

// POST /api/nginx-proxy/streams - Create stream
router.post('/streams', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { incoming_port, forwarding_host, forwarding_port, tcp_forwarding, udp_forwarding } = req.body;

    // Input validation
    if (!incoming_port || !isValidPort(incoming_port)) {
        return res.status(400).json({ error: 'Valid incoming port is required' });
    }

    if (!forwarding_host || (!isValidDomain(forwarding_host) && !isValidIPv4(forwarding_host))) {
        return res.status(400).json({ error: 'Valid forwarding host is required' });
    }

    if (!forwarding_port || !isValidPort(forwarding_port)) {
        return res.status(400).json({ error: 'Valid forwarding port is required' });
    }

    if (!tcp_forwarding && !udp_forwarding) {
        return res.status(400).json({ error: 'At least one protocol (TCP or UDP) must be enabled' });
    }

    try {
        const client = await getNPMClient();

        const streamData = {
            incoming_port: parseInt(incoming_port, 10),
            forwarding_host,
            forwarding_port: parseInt(forwarding_port, 10),
            tcp_forwarding: tcp_forwarding === true ? 1 : 0,
            udp_forwarding: udp_forwarding === true ? 1 : 0,
            meta: {}
        };

        const response = await client.post('/api/nginx/streams', streamData);

        res.status(201).json({
            success: true,
            stream: response.data,
            message: 'Stream created successfully'
        });
    } catch (error: any) {
        console.error('Failed to create stream:', error.message);

        if (error.response?.data?.message) {
            return res.status(error.response.status || 400).json({
                error: error.response.data.message
            });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to create stream'
        });
    }
});

// DELETE /api/nginx-proxy/streams/:id - Delete stream
router.delete('/streams/:id', async (req: Request, res: Response) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    const { id } = req.params;

    if (!id || !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid stream ID' });
    }

    try {
        const client = await getNPMClient();
        await client.delete(`/api/nginx/streams/${id}`);

        res.json({
            success: true,
            message: 'Stream deleted successfully'
        });
    } catch (error: any) {
        console.error('Failed to delete stream:', error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: 'Stream not found' });
        }

        res.status(error.response?.status || 500).json({
            error: 'Failed to delete stream'
        });
    }
});

export default router;
