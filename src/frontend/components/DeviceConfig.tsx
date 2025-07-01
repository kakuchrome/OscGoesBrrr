

import React, { useEffect, useState } from "react";
import { ipcRenderer } from "electron";

interface Device {
    id: string;
    type: 'linear' | 'vibrate' | 'rotate';
    deviceId: string;
}

export default function DeviceConfig() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [config, setConfig] = useState<Map<string, string>>(new Map());
    const [manualSaved, setManualSaved] = useState(false);
    const [customKey, setCustomKey] = useState("");
    const [customValue, setCustomValue] = useState("");

    const [manualConfigText, setManualConfigText] = useState<string>('');

    useEffect(() => {
        let destroyed = false;
        (async () => {
            const loadedDevices = await ipcRenderer.invoke('devices:get');
            const configText = await ipcRenderer.invoke('config:load');
            if (destroyed) return;

            setDevices(loadedDevices);
            const newConfig = new Map<string, string>();
            for (const line of configText.split('\n')) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('/') || trimmedLine.startsWith('#')) continue;
                const parts = trimmedLine.split('=', 2);
                const key = parts[0]?.trim();
                if (!key) continue;
                const value: string = (parts.length > 1 ? parts[1] : '').trim();
                newConfig.set(key, value);
            }
            setConfig(newConfig);
            setManualConfigText(configText);
        })();
        return () => {
            destroyed = true;
        }
    }, []);

    const handleConfigChange = (key: string, value: string) => {
        const newConfig = new Map(config);
        newConfig.set(key, value);
        setConfig(newConfig);
        saveConfig(newConfig);
        setManualConfigText(Array.from(newConfig.entries()).map(([key, value]) => `${key}=${value}`).join('\n'));
    };

    const saveConfig = (configToSave: Map<string, string>) => {
        let configText = '';
        for (const [key, value] of configToSave.entries()) {
            configText += `${key}=${value}\n`;
        }
        ipcRenderer.invoke('config:save', configText);
    };

    const handleManualSave = () => {
        const newConfig = new Map<string, string>();
        for (const line of manualConfigText.split('\n')) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('/') || trimmedLine.startsWith('#')) continue;
            const parts = trimmedLine.split('=', 2);
            const key: string = parts[0]?.trim() || '';
            if (!key) continue;
            const value: string = (parts[1] || '').trim();
            newConfig.set(key, value);
        }
        setConfig(newConfig);
        saveConfig(newConfig);
        setManualConfigText(Array.from(newConfig.entries()).map(([key, value]) => `${key}=${value}`).join('\n'));
        setManualSaved(true);
    };

    const handleResetConfig = async () => {
        await ipcRenderer.invoke('config:save', ''); // Clear config file
        const configText = await ipcRenderer.invoke('config:load'); // Reload default config
        const newConfig = new Map<string, string>();
        for (const line of configText.split('\n')) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('/') || trimmedLine.startsWith('#')) continue;
            const parts = trimmedLine.split('=', 2);
            const key = parts[0]?.trim();
            if (!key) continue;
            const value: string = (parts.length > 1 ? parts[1] : '').trim();
            newConfig.set(key, value);
        }
        setConfig(newConfig);
        setManualConfigText(configText);
    };
    
    useEffect(() => {
        if (manualSaved) {
            const timer = setTimeout(() => {
                setManualSaved(false);
            }, 3000); // 3秒後に非表示
            return () => clearTimeout(timer);
        }
    }, [manualSaved]);

    useEffect(() => {
        function onSaved() {
            // setShowSaved(true); // 自動保存の通知は不要になったためコメントアウト
        }
        ipcRenderer.on('config:saved', onSaved);
        return () => { ipcRenderer.off('config:saved', onSaved); };
    }, []);

    const getConfigValue = (key: string, defaultValue: string): string | undefined => {
        const value = config.get(key);
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    };

    const handleAddCustomConfig = () => {
        if (customKey) {
            handleConfigChange(customKey, customValue);
            setCustomKey("");
            setCustomValue("");
        }
    };

    return (
        <div>
            <h2>Device Configuration <a href="https://osc.toys/settings" target="_blank">(?)</a></h2>
            {devices.map(device => (
                <div key={device.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                    <h3>{device.deviceId} ({device.id})</h3>
                    <div>
                        <strong>Type:</strong>
                        <div>
                            <label>
                                <input type="radio" value="all" checked={getConfigValue(`${device.id}.type`, 'all') === 'all'} onChange={e => handleConfigChange(`${device.id}.type`, e.target.value)} />
                                All
                            </label>
                            <label>
                                <input type="radio" value="pen" checked={getConfigValue(`${device.id}.type`, 'all') === 'pen'} onChange={e => handleConfigChange(`${device.id}.type`, e.target.value)} />
                                Penetration
                            </label>
                            <label>
                                <input type="radio" value="orf" checked={getConfigValue(`${device.id}.type`, 'all') === 'orf'} onChange={e => handleConfigChange(`${device.id}.type`, e.target.value)} />
                                Orifice
                            </label>
                            <label>
                                <input type="radio" value="touch" checked={getConfigValue(`${device.id}.type`, 'all') === 'touch'} onChange={e => handleConfigChange(`${device.id}.type`, e.target.value)} />
                                Touch
                            </label>
                            <label>
                                <input type="radio" value="audio" checked={getConfigValue(`${device.id}.type`, 'all') === 'audio'} onChange={e => handleConfigChange(`${device.id}.type`, e.target.value)} />
                                Audio
                            </label>
                        </div>
                    </div>
                    <div>
                        <strong>Linear Motion:</strong>
                        <label className="toggle-switch">
                            <button
                                onClick={() => handleConfigChange(`${device.id}.linear`, '1')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.linear`, '1') === '1' ? 'green' : 'gray', color: 'white' }}
                            >
                                ON
                            </button>
                            <button
                                onClick={() => handleConfigChange(`${device.id}.linear`, '0')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.linear`, '1') === '0' ? 'red' : 'gray', color: 'white' }}
                            >
                                OFF
                            </button>
                        </label>
                    </div>
                    <div>
                        <strong>Touch Self:</strong>
                        <label className="toggle-switch">
                            <button
                                onClick={() => handleConfigChange(`${device.id}.touchSelf`, '1')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.touchSelf`, '0') === '1' ? 'green' : 'gray', color: 'white' }}
                            >
                                ON
                            </button>
                            <button
                                onClick={() => handleConfigChange(`${device.id}.touchSelf`, '0')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.touchSelf`, '0') === '0' ? 'red' : 'gray', color: 'white' }}
                            >
                                OFF
                            </button>
                        </label>
                    </div>
                    <div>
                        <strong>Penetration Self:</strong>
                        <label className="toggle-switch">
                            <button
                                onClick={() => handleConfigChange(`${device.id}.penSelf`, '1')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.penSelf`, '0') === '1' ? 'green' : 'gray', color: 'white' }}
                            >
                                ON
                            </button>
                            <button
                                onClick={() => handleConfigChange(`${device.id}.penSelf`, '0')}
                                style={{ backgroundColor: getConfigValue(`${device.id}.penSelf`, '0') === '0' ? 'red' : 'gray', color: 'white' }}
                            >
                                OFF
                            </button>
                        </label>
                    </div>
                    <div>
                        <strong>Idle Level:</strong>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={getConfigValue(`${device.id}.idle`, '0')}
                            onChange={e => handleConfigChange(`${device.id}.idle`, e.target.value)}
                        />
                        <span>{getConfigValue(`${device.id}.idle`, '0')}</span>
                    </div>
                    <div>
                        <strong>Scale:</strong>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={getConfigValue(`${device.id}.scale`, '1')}
                            onChange={e => handleConfigChange(`${device.id}.scale`, e.target.value)}
                        />
                        <span>{getConfigValue(`${device.id}.scale`, '1')}</span>
                    </div>
                </div>
            ))}
            <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '10px' }}>
                <h3>Config</h3>
                <textarea
                    style={{width: '100%', height: '200px'}}
                    value={manualConfigText}
                    onChange={e => setManualConfigText(e.target.value)}
                />
                <button onClick={handleManualSave}>Save Manual Config</button>
                <button onClick={handleResetConfig} style={{ marginLeft: '10px' }}>Reset All Config</button>
                {manualSaved ? <span style={{ marginLeft: '10px', color: 'green' }}>manual saved OK!</span> : null}
            </div>
            {manualSaved ? <span>Saved</span> : null}
        </div>
    );
}
