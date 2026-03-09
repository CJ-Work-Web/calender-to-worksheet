/** 
 * Google Calendar Service (GIS + GAPI Bridge)
 * This uses the newer Google Identity Services (GIS) for authentication
 * while keeping the Google API Client (GAPI) for data fetching.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

let tokenClient;
let gapiInited = false;
let gisInited = false;
let signInResolver = null;
let signInRejecter = null;

/**
 * Initializes the GAPI client and the GIS token client.
 * @param {Function} onReady Callback when everything is ready
 */
export const initGoogleAPI = (onUpdateSigninStatus) => {
    return new Promise((resolve, reject) => {
        // 1. Initialize GAPI client
        window.gapi.load('client', async () => {
            try {
                await window.gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                checkReady(onUpdateSigninStatus, resolve);
            } catch (err) {
                console.error("GAPI init error:", err);
                reject(err);
            }
        });

        // 2. Initialize GIS token client
        try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (resp) => {
                    if (resp.error !== undefined) {
                        if (signInRejecter) signInRejecter(resp);
                        throw (resp);
                    }
                    console.log("GIS token received");
                    onUpdateSigninStatus(true);
                    if (signInResolver) {
                        signInResolver();
                        signInResolver = null;
                        signInRejecter = null;
                    }
                },
            });
            gisInited = true;
            checkReady(onUpdateSigninStatus, resolve);
        } catch (err) {
            console.error("GIS init error:", err);
            reject(err);
        }
    });
};

const checkReady = (onUpdateSigninStatus, resolve) => {
    if (gapiInited && gisInited) {
        // Check if we already have a token
        const token = window.gapi.client.getToken();
        if (token && token.access_token) {
            onUpdateSigninStatus(true);
        }
        resolve();
    }
};

/**
 * Request an access token via GIS popup
 */
export const signIn = () => {
    return new Promise((resolve, reject) => {
        try {
            signInResolver = resolve;
            signInRejecter = reject;
            // Sometime needs to check if token exists, but requestAccessToken always triggers popup for new token
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } catch (err) {
            signInResolver = null;
            signInRejecter = null;
            reject(err);
        }
    });
};

/**
 * Sign out (clear token)
 */
export const signOut = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
        window.google.accounts.oauth2.revoke(token.access_token);
        window.gapi.client.setToken('');
    }
};

export const fetchCalendars = async () => {
    try {
        const response = await window.gapi.client.calendar.calendarList.list({
            showHidden: true
        });
        return response.result.items;
    } catch (err) {
        console.error("Error fetching calendars:", err);
        throw err;
    }
};

/**
 * 將本地 Date 物件轉換為含有時區偏移的字串 (RFC3339)
 * 解決 toISOString() 造成的 UTC 時差問題
 */
const formatToLocalISO = (date) => {
    const tzo = -date.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = (num) => (num < 10 ? '0' : '') + num;
    
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        ':' + pad(Math.abs(tzo) % 60);
};

export const fetchEvents = async (calendarId, timeMin, timeMax) => {
    try {
        let allItems = [];
        let nextPageToken = null;

        // 構建精準的本地查詢範圍
        const start = new Date(timeMin + "T00:00:00");
        const end = new Date(timeMax + "T23:59:59");

        do {
            const response = await window.gapi.client.calendar.events.list({
                calendarId: calendarId,
                timeMin: formatToLocalISO(start),
                timeMax: formatToLocalISO(end),
                showDeleted: false,
                singleEvents: true,
                maxResults: 2500,
                orderBy: 'startTime',
                pageToken: nextPageToken || undefined
            });

            const items = response.result.items || [];
            allItems = allItems.concat(items);
            nextPageToken = response.result.nextPageToken;

        } while (nextPageToken);

        return allItems;
    } catch (err) {
        console.error("Error fetching events:", err);
        throw err;
    }
};
