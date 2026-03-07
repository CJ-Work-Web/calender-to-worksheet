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
                        throw (resp);
                    }
                    console.log("GIS token received");
                    onUpdateSigninStatus(true);
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
        resolve();
    }
};

/**
 * Request an access token via GIS popup
 */
export const signIn = () => {
    return new Promise((resolve, reject) => {
        try {
            // Sometime needs to check if token exists, but requestAccessToken always triggers popup for new token
            tokenClient.requestAccessToken({ prompt: 'consent' });
            resolve();
        } catch (err) {
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

export const fetchEvents = async (calendarId, timeMin, timeMax) => {
    try {
        const response = await window.gapi.client.calendar.events.list({
            calendarId: calendarId,
            timeMin: new Date(timeMin).toISOString(),
            timeMax: new Date(timeMax + "T23:59:59").toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 2500,
            orderBy: 'startTime',
        });
        return response.result.items || [];
    } catch (err) {
        console.error("Error fetching events:", err);
        throw err;
    }
};
