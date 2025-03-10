/**
 * API Diagnostics and Monitoring Utilities
 * This file contains functions to help diagnose and monitor API issues
 */

// API request tracking
const API_METRICS = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    requestsByEndpoint: {},
    errorsByCode: {},
    lastError: null,
    startTime: Date.now()
};

// Track a successful API request
const trackSuccessfulRequest = (endpoint) => {
    API_METRICS.totalRequests++;
    API_METRICS.successfulRequests++;
    
    // Track by endpoint
    if (!API_METRICS.requestsByEndpoint[endpoint]) {
        API_METRICS.requestsByEndpoint[endpoint] = { 
            total: 0, 
            successful: 0, 
            failed: 0 
        };
    }
    API_METRICS.requestsByEndpoint[endpoint].total++;
    API_METRICS.requestsByEndpoint[endpoint].successful++;
    
    return API_METRICS;
};

// Track a failed API request
const trackFailedRequest = (endpoint, statusCode, errorMessage) => {
    API_METRICS.totalRequests++;
    API_METRICS.failedRequests++;
    
    // Track by endpoint
    if (!API_METRICS.requestsByEndpoint[endpoint]) {
        API_METRICS.requestsByEndpoint[endpoint] = { 
            total: 0, 
            successful: 0, 
            failed: 0 
        };
    }
    API_METRICS.requestsByEndpoint[endpoint].total++;
    API_METRICS.requestsByEndpoint[endpoint].failed++;
    
    // Track by error code
    if (!API_METRICS.errorsByCode[statusCode]) {
        API_METRICS.errorsByCode[statusCode] = 0;
    }
    API_METRICS.errorsByCode[statusCode]++;
    
    // Store last error
    API_METRICS.lastError = {
        timestamp: new Date().toISOString(),
        endpoint,
        statusCode,
        message: errorMessage
    };
    
    return API_METRICS;
};

// Verify API key validity
const verifyApiKey = (apiKey) => {
    // Basic validation
    if (!apiKey || apiKey.length < 20) {
        return {
            valid: false,
            reason: 'API key appears too short or is missing'
        };
    }
    
    // Check for common placeholders that might indicate it's not a real key
    const placeholders = ['YOUR_API_KEY', 'DEMO_KEY', 'TEST_KEY', 'API_KEY'];
    for (const placeholder of placeholders) {
        if (apiKey.includes(placeholder)) {
            return {
                valid: false,
                reason: `API key contains placeholder text: ${placeholder}`
            };
        }
    }
    
    return { valid: true };
};

// Get API usage report
const getApiUsageReport = () => {
    const runtime = Math.floor((Date.now() - API_METRICS.startTime) / 1000);
    const hours = Math.floor(runtime / 3600);
    const minutes = Math.floor((runtime % 3600) / 60);
    const seconds = runtime % 60;
    
    return {
        ...API_METRICS,
        successRate: API_METRICS.totalRequests ? 
            (API_METRICS.successfulRequests / API_METRICS.totalRequests * 100).toFixed(2) + '%' : 'N/A',
        runtime: `${hours}h ${minutes}m ${seconds}s`,
        requestsPerMinute: (API_METRICS.totalRequests / (runtime / 60)).toFixed(2)
    };
};

// Test API connectivity and key validity
const testApiConnectivity = async (apiConfig, apiHeaders) => {
    try {
        const testEndpoint = `${apiConfig.baseUrl}/v1/hotels/locations?name=London&locale=en-us`;
        console.log('Testing API connectivity...');
        
        const response = await fetch(testEndpoint, {
            method: 'GET',
            headers: apiHeaders
        });
        
        if (response.status === 200) {
            return {
                status: 'success',
                message: 'API connection successful',
                responseStatus: response.status
            };
        } else if (response.status === 403) {
            return {
                status: 'failed',
                message: 'API key validation failed - Access Forbidden (403)',
                responseStatus: response.status,
                suggestion: 'Please verify your API key and permissions'
            };
        } else if (response.status === 429) {
            return {
                status: 'failed',
                message: 'Rate limit exceeded (429)',
                responseStatus: response.status,
                suggestion: 'Wait before making more requests or increase your rate limit allocation'
            };
        } else {
            return {
                status: 'failed',
                message: `API test failed with status ${response.status}`,
                responseStatus: response.status
            };
        }
    } catch (error) {
        return {
            status: 'error',
            message: 'API connection error',
            error: error.message
        };
    }
};

// Export all functions
window.ApiDiagnostics = {
    trackSuccessfulRequest,
    trackFailedRequest,
    verifyApiKey,
    getApiUsageReport,
    testApiConnectivity,
    API_METRICS
};
