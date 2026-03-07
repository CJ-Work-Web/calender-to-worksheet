import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { initGoogleAPI, signIn, signOut, fetchCalendars } from '../services/GoogleCalendarService';

const GoogleAuth = ({ isAuthenticated, setIsAuthenticated, setCalendars }) => {
    const [isInitializing, setIsInitializing] = useState(true);
    const [initError, setInitError] = useState('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!clientId) {
            setInitError('請在 .env 檔案中設定 VITE_GOOGLE_CLIENT_ID。');
            setIsInitializing(false);
            return;
        }

        const loadAPI = async () => {
            try {
                // 設定初始化完成後的狀態回調
                await initGoogleAPI(updateSigninStatus);
                console.log("Google API & GIS initialized successfully");
            } catch (err) {
                setInitError('Google API 初始化失敗。請確保網路連線正常且 Client ID 正確。');
                console.error(err);
            } finally {
                setIsInitializing(false);
            }
        };

        // 確保 gapi 與 google (gis) 腳本載入
        const checkScripts = setInterval(() => {
            if (window.gapi && window.google) {
                clearInterval(checkScripts);
                loadAPI();
            }
        }, 100);

        return () => clearInterval(checkScripts);
    }, [clientId]);

    const updateSigninStatus = async (isSignedIn) => {
        console.log("Sign-in status (GIS):", isSignedIn);
        setIsAuthenticated(isSignedIn);
        if (isSignedIn) {
            try {
                const cals = await fetchCalendars();
                setCalendars(cals || []);
            } catch (err) {
                console.error("無法取得日曆清單:", err);
            }
        } else {
            setCalendars([]);
        }
    };

    const handleSignIn = () => {
        signIn().catch(err => {
            console.error("GIS Sign-in failed:", err);
            if (err.error === 'popup_closed_by_user') {
                alert("登入視窗被關閉，請重試。");
            } else {
                alert("登入失敗，請檢查瀏覽器是否限制了彈出視窗或第三方 Cookie。");
            }
        });
    };

    const handleSignOut = () => {
        signOut();
        setIsAuthenticated(false);
        setCalendars([]);
    };

    if (initError) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', borderColor: 'var(--danger)', padding: '1.5rem' }}>
                <p style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <AlertTriangle />
                    {initError}
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Google 帳號授權
                    {isAuthenticated && <CheckCircle size={18} color="var(--success)" />}
                </h2>
                <p className="subtitle" style={{ fontSize: '0.95rem' }}>
                    {isInitializing
                        ? '正在載入驗證元件...'
                        : isAuthenticated
                            ? '已成功連結您的 Google 帳號。'
                            : '請先授權讓應用程式讀取您的日曆行程。'}
                </p>
            </div>
            <div>
                {isAuthenticated ? (
                    <button className="btn btn-outline" onClick={handleSignOut} disabled={isInitializing}>
                        <LogOut size={18} />
                        登出
                    </button>
                ) : (
                    <button className="btn" onClick={handleSignIn} disabled={isInitializing}>
                        <LogIn size={18} />
                        以 Google 帳號授權
                    </button>
                )}
            </div>
        </div>
    );
};

export default GoogleAuth;
