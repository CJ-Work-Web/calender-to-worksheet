import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { fetchEvents } from '../services/GoogleCalendarService';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const QueryForm = ({ calendars, isProcessing, setIsProcessing, setEventsData }) => {
    const [selectedCalendar, setSelectedCalendar] = useState('');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [errorMsg, setErrorMsg] = useState('');

    const handleFetch = async (e) => {
        e.preventDefault();
        if (!selectedCalendar) {
            setErrorMsg("請選擇一個日曆");
            return;
        }
        if (!startDate || !endDate) {
            setErrorMsg("請輸入完整的日期區間");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setErrorMsg("開始日期不能晚於結束日期");
            return;
        }

        setErrorMsg('');
        setIsProcessing(true);
        setEventsData([]);

        try {
            const events = await fetchEvents(selectedCalendar, startDate, endDate);
            setEventsData(events);
            if (events.length === 0) {
                setErrorMsg("該區間內沒有行程");
            }
        } catch (err) {
            setErrorMsg("擷取日曆資料時發生錯誤");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>設定查詢條件</h3>

            <form onSubmit={handleFetch}>
                <div className="form-group">
                    <label className="form-label">選擇日曆</label>
                    <select
                        className="input-field"
                        value={selectedCalendar}
                        onChange={(e) => setSelectedCalendar(e.target.value)}
                        disabled={isProcessing || calendars.length === 0}
                    >
                        <option value="">-- 請選擇 --</option>
                        {calendars.map(cal => (
                            <option key={cal.id} value={cal.id}>{cal.summary}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">開始日期</label>
                    <input
                        type="date"
                        id="startDate"
                        className="input-field"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">結束日期</label>
                    <input
                        type="date"
                        id="endDate"
                        className="input-field"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>

                {errorMsg && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem', marginTop: '0.5rem' }}>{errorMsg}</p>
                )}

                <button
                    type="submit"
                    className="btn"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    disabled={isProcessing || calendars.length === 0}
                >
                    {isProcessing ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--primary)' }}></div> : <Search size={18} />}
                    {isProcessing ? '擷取中...' : '抓取行程'}
                </button>
            </form>
        </div>
    );
};

export default QueryForm;
