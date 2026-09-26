const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const url = require('url');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');

// In-memory storage
let services = [];
let idCounter = 1;

// Auto check settings
let settings = {
    enabled: false,
    interval: 30,
    timer: null,
    webhookUrl: '',
    concurrency: 5
};

// ==================== 数据持久化 ====================

// Save data to file
function saveData() {
    try {
        const data = {
            services,
            idCounter,
            settings: {
                enabled: false, // 不保存 enabled 状态，重启后默认关闭
                interval: settings.interval,
                webhookUrl: settings.webhookUrl,
                concurrency: settings.concurrency
            }
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[Data] Saved to file');
    } catch (error) {
        console.error('[Data] Save failed:', error.message);
    }
}

// Load data from file
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            const data = JSON.parse(raw);
            services = data.services || [];
            idCounter = data.idCounter || 1;
            if (data.settings) {
                settings.interval = data.settings.interval || 30;
                settings.webhookUrl = data.settings.webhookUrl || '';
                settings.concurrency = data.settings.concurrency || 5;
            }
            console.log(`[Data] Loaded ${services.length} services from file`);
        }
    } catch (error) {
        console.error('[Data] Load failed:', error.message);
    }
}

// ==================== 辅助函数 ====================

// Generate unique ID
function generateId() {
    return idCounter++;
}

// Check HTTP service with retry
function checkHttpService(targetUrl) {
    const MAX_RETRIES = 2;
    const TIMEOUT = 15000;
    
    function attempt(retriesLeft) {
        return new Promise((resolve) => {
            const protocol = targetUrl.startsWith('https') ? require('https') : http;
            const req = protocol.get(targetUrl, { timeout: TIMEOUT }, (res) => {
                resolve({ online: res.statusCode >= 100 && res.statusCode < 600, statusCode: res.statusCode });
            });
            req.on('error', () => {
                if (retriesLeft > 0) {
                    setTimeout(() => attempt(retriesLeft - 1).then(resolve), 1000);
                } else {
                    resolve({ online: false, statusCode: null });
                }
            });
            req.on('timeout', () => {
                req.destroy();
                if (retriesLeft > 0) {
                    setTimeout(() => attempt(retriesLeft - 1).then(resolve), 1000);
                } else {
                    resolve({ online: false, statusCode: null });
                }
            });
        });
    }
    return attempt(MAX_RETRIES);
}

// Check TCP port
function checkPortService(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let online = false;

        socket.setTimeout(10000);
        socket.on('connect', () => {
            online = true;
            socket.destroy();
            resolve({ online, port });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ online, port });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ online, port });
        });

        socket.connect(port, host);
    });
}

// Check service based on type
async function checkService(service) {
    const startTime = Date.now();
    let result;

    if (service.type === 'url') {
        result = await checkHttpService(service.target);
    } else if (service.type === 'port') {
        const [host, port] = service.target.split(':');
        result = await checkPortService(host, parseInt(port));
    } else {
        result = { online: false, error: 'Unknown service type' };
    }

    const duration = Date.now() - startTime;
    const status = result.online ? 'online' : 'offline';

    return {
        ...service,
        status,
        lastCheck: new Date().toISOString(),
        responseTime: duration,
        history: [...(service.history || []), { time: new Date().toISOString(), status, duration }].slice(-50)
    };
}

// ==================== 并发控制 ====================

// Check all services with concurrency control
async function checkAllServices() {
    const concurrency = settings.concurrency || 5;
    const chunks = [];
    
    for (let i = 0; i < services.length; i += concurrency) {
        chunks.push(services.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
        await Promise.all(chunk.map(async (service) => {
            const index = services.findIndex(s => s.id === service.id);
            if (index !== -1) {
                services[index] = await checkService(service);
            }
        }));
    }
    
    return services;
}

// ==================== 健康度计算 ====================

// Calculate health score for a service (0-100)
function calculateHealthScore(service) {
    const history = service.history || [];
    if (history.length === 0) return 0;

    // Uptime score (40 points)
    const onlineCount = history.filter(h => h.status === 'online').length;
    const uptimeScore = (onlineCount / history.length) * 40;

    // Response time score (40 points)
    const avgResponseTime = history.reduce((sum, h) => sum + h.duration, 0) / history.length;
    let responseScore = 40;
    if (avgResponseTime > 3000) responseScore = 0;
    else if (avgResponseTime > 2000) responseScore = 10;
    else if (avgResponseTime > 1000) responseScore = 20;
    else if (avgResponseTime > 500) responseScore = 30;

    // Consistency score (20 points) - based on recent checks
    const recentHistory = history.slice(-10);
    const recentOnlineCount = recentHistory.filter(h => h.status === 'online').length;
    const consistencyScore = (recentOnlineCount / recentHistory.length) * 20;

    return Math.round(uptimeScore + responseScore + consistencyScore);
}

// ==================== 通知功能 ====================

// Send webhook notification
async function sendNotification(service, event) {
    if (!settings.webhookUrl) return;

    try {
        const payload = JSON.stringify({
            event,
            service: {
                id: service.id,
                name: service.name,
                target: service.target,
                status: service.status
            },
            timestamp: new Date().toISOString()
        });

        const webhookUrl = new URL(settings.webhookUrl);
        const protocol = webhookUrl.protocol === 'https:' ? require('https') : http;
        
        const options = {
            hostname: webhookUrl.hostname,
            port: webhookUrl.port,
            path: webhookUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = protocol.request(options, (res) => {
            console.log(`[Notification] Sent to webhook, status: ${res.statusCode}`);
        });

        req.on('error', (error) => {
            console.error('[Notification] Failed:', error.message);
        });

        req.write(payload);
        req.end();
    } catch (error) {
        console.error('[Notification] Error:', error.message);
    }
}

// ==================== 服务检查 ====================

// Check single service with notification
async function checkServiceWithNotification(id) {
    const service = services.find(s => s.id === id);
    if (!service) return null;

    const oldStatus = service.status;
    const index = services.findIndex(s => s.id === id);
    services[index] = await checkService(service);
    const newService = services[index];

    // Send notification on status change
    if (oldStatus !== 'unknown' && oldStatus !== newService.status) {
        const event = newService.status === 'online' ? 'recovered' : 'down';
        await sendNotification(newService, event);
    }

    return newService;
}

// Auto check with notifications
async function autoCheckAll() {
    const oldStatuses = services.map(s => ({ id: s.id, status: s.status }));
    await checkAllServices();
    
    // Check for status changes and send notifications
    for (const service of services) {
        const oldStatus = oldStatuses.find(s => s.id === service.id);
        if (oldStatus && oldStatus.status !== 'unknown' && oldStatus.status !== service.status) {
            const event = service.status === 'online' ? 'recovered' : 'down';
            await sendNotification(service, event);
        }
    }
}

// ==================== 自动检查控制 ====================

// Start auto check
function startAutoCheck() {
    if (settings.timer) {
        clearInterval(settings.timer);
    }
    
    if (settings.enabled && settings.interval > 0) {
        console.log(`[Auto Check] Enabled, interval: ${settings.interval}s`);
        settings.timer = setInterval(async () => {
            console.log(`[Auto Check] Running at ${new Date().toLocaleString()}`);
            await autoCheckAll();
        }, settings.interval * 1000);
    } else {
        console.log('[Auto Check] Disabled');
    }
}

// Stop auto check
function stopAutoCheck() {
    if (settings.timer) {
        clearInterval(settings.timer);
        settings.timer = null;
    }
    settings.enabled = false;
}

// ==================== HTTP 工具函数 ====================

// Parse JSON body
function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve(null);
            }
        });
    });
}

// Send JSON response
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Serve static file
function serveStatic(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(PUBLIC_DIR, filePath);
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, content) => {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// ==================== 创建服务器 ====================

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ==================== API 路由 ====================

    // Services CRUD
    if (pathname === '/api/services') {
        if (req.method === 'GET') {
            sendJSON(res, services);
        } else if (req.method === 'POST') {
            const body = await parseBody(req);
            if (!body || !body.name) {
                return sendJSON(res, { error: 'Name is required' }, 400);
            }

            let type, target;
            if (body.url) {
                type = 'url';
                target = body.url;
            } else if (body.port) {
                type = 'port';
                target = body.port;
            } else {
                return sendJSON(res, { error: 'Either url or port is required' }, 400);
            }

            const newService = {
                id: generateId(),
                name: body.name,
                type,
                target,
                status: 'unknown',
                lastCheck: null,
                history: [],
                healthScore: 0
            };

            services.push(newService);
            saveData();
            sendJSON(res, newService, 201);
        }
    } else if (pathname.match(/^\/api\/services\/\d+$/) && req.method === 'DELETE') {
        const id = parseInt(pathname.split('/').pop());
        const initialLength = services.length;
        services = services.filter(s => s.id !== id);

        if (services.length === initialLength) {
            return sendJSON(res, { error: 'Service not found' }, 404);
        }

        saveData();
        sendJSON(res, { success: true });
    }
    // Check endpoints
    else if (pathname.match(/^\/api\/check\/\d+$/) && req.method === 'GET') {
        const id = parseInt(pathname.split('/').pop());
        const updatedService = await checkServiceWithNotification(id);

        if (!updatedService) {
            return sendJSON(res, { error: 'Service not found' }, 404);
        }

        updatedService.healthScore = calculateHealthScore(updatedService);
        saveData();
        sendJSON(res, updatedService);
    } else if (pathname === '/api/check-all' && req.method === 'GET') {
        try {
            await autoCheckAll();
            // Calculate health scores
            services.forEach(s => {
                s.healthScore = calculateHealthScore(s);
            });
            saveData();
            sendJSON(res, services);
        } catch (error) {
            sendJSON(res, { error: 'Error checking services' }, 500);
        }
    }
    // Settings
    else if (pathname === '/api/settings') {
        if (req.method === 'GET') {
            sendJSON(res, {
                enabled: settings.enabled,
                interval: settings.interval,
                webhookUrl: settings.webhookUrl,
                concurrency: settings.concurrency
            });
        } else if (req.method === 'POST') {
            const body = await parseBody(req);
            if (!body) {
                return sendJSON(res, { error: 'Invalid body' }, 400);
            }

            if (body.interval !== undefined) {
                settings.interval = Math.max(5, Math.min(3600, parseInt(body.interval) || 30));
            }
            if (body.enabled !== undefined) {
                settings.enabled = body.enabled;
            }
            if (body.webhookUrl !== undefined) {
                settings.webhookUrl = body.webhookUrl || '';
            }
            if (body.concurrency !== undefined) {
                settings.concurrency = Math.max(1, Math.min(20, parseInt(body.concurrency) || 5));
            }

            startAutoCheck();
            saveData();
            sendJSON(res, {
                enabled: settings.enabled,
                interval: settings.interval,
                webhookUrl: settings.webhookUrl,
                concurrency: settings.concurrency
            });
        }
    }
    // Stats
    else if (pathname === '/api/stats') {
        const stats = services.map(service => {
            const history = service.history || [];
            const total = history.length;
            const onlineCount = history.filter(h => h.status === 'online').length;
            const avgResponseTime = total > 0 
                ? Math.round(history.reduce((sum, h) => sum + h.duration, 0) / total)
                : 0;
            const healthScore = calculateHealthScore(service);
            
            return {
                id: service.id,
                name: service.name,
                uptime: total > 0 ? Math.round((onlineCount / total) * 100) : 0,
                totalChecks: total,
                onlineCount,
                offlineCount: total - onlineCount,
                avgResponseTime,
                healthScore
            };
        });
        sendJSON(res, stats);
    }
    // Export
    else if (pathname === '/api/export') {
        const format = parsedUrl.query.format || 'json';
        
        if (format === 'csv') {
            // Generate CSV
            let csv = 'ID,Name,Type,Target,Status,LastCheck,ResponseTime,HealthScore,Uptime\n';
            services.forEach(s => {
                const history = s.history || [];
                const total = history.length;
                const onlineCount = history.filter(h => h.status === 'online').length;
                const uptime = total > 0 ? Math.round((onlineCount / total) * 100) : 0;
                
                csv += `${s.id},"${s.name}",${s.type},"${s.target}",${s.status},${s.lastCheck || ''},${s.responseTime || 0},${s.healthScore || 0},${uptime}\n`;
            });
            
            res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="services-export.csv"'
            });
            res.end(csv);
        } else {
            // JSON export
            const exportData = {
                exportTime: new Date().toISOString(),
                services: services.map(s => ({
                    ...s,
                    healthScore: calculateHealthScore(s)
                }))
            };
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="services-export.json"'
            });
            res.end(JSON.stringify(exportData, null, 2));
        }
    }
    // Webhook test
    else if (pathname === '/api/webhook/test' && req.method === 'POST') {
        const body = await parseBody(req);
        const webhookUrl = body?.url || settings.webhookUrl;
        
        if (!webhookUrl) {
            return sendJSON(res, { error: 'Webhook URL is required' }, 400);
        }

        try {
            const payload = JSON.stringify({
                event: 'test',
                message: 'This is a test notification from Service Monitor',
                timestamp: new Date().toISOString()
            });

            const webhookUrlObj = new URL(webhookUrl);
            const protocol = webhookUrlObj.protocol === 'https:' ? require('https') : http;
            
            const options = {
                hostname: webhookUrlObj.hostname,
                port: webhookUrlObj.port,
                path: webhookUrlObj.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: 5000
            };

            const testReq = protocol.request(options, (testRes) => {
                sendJSON(res, { 
                    success: true, 
                    statusCode: testRes.statusCode,
                    message: 'Webhook test sent successfully' 
                });
            });

            testReq.on('error', (error) => {
                sendJSON(res, { 
                    success: false, 
                    error: error.message 
                }, 500);
            });

            testReq.on('timeout', () => {
                testReq.destroy();
                sendJSON(res, { 
                    success: false, 
                    error: 'Request timeout' 
                }, 500);
            });

            testReq.write(payload);
            testReq.end();
        } catch (error) {
            sendJSON(res, { 
                success: false, 
                error: error.message 
            }, 500);
        }
    }
    // Static files
    else {
        serveStatic(req, res);
    }
});

// ==================== 启动服务器 ====================

// Load saved data
loadData();

// Start server
server.listen(PORT, () => {
    console.log(`Service Monitor running at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
    console.log(`Auto Check: ${settings.enabled ? 'ON' : 'OFF'}, Interval: ${settings.interval}s`);
    console.log(`Concurrency: ${settings.concurrency}, Webhook: ${settings.webhookUrl || 'Not configured'}`);
});

// Save data on exit
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    stopAutoCheck();
    saveData();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down...');
    stopAutoCheck();
    saveData();
    process.exit(0);
});

