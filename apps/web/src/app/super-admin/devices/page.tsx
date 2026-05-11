'use client';

import { useEffect, useState } from 'react';
import { config } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@smartduka/ui';
import {
  Shield, Smartphone, Monitor, Tablet, Clock, Trash2, AlertTriangle,
  CheckCircle, RefreshCw, Search, Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DeviceUser {
  _id: string;
  email?: string;
  name?: string;
  role?: string;
}

interface Device {
  _id: string;
  userId: string | DeviceUser;
  fingerprint: string;
  deviceName: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  ipAddress?: string;
  isTrusted: boolean;
  isActive: boolean;
  loginCount: number;
  lastLoginAt: string;
  trustedAt?: string;
  expiresAt?: string;
}

interface Stats {
  total: number;
  trusted: number;
  active: number;
  learning: number;
}

export default function SuperAdminDevicesPage() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTrusted, setFilterTrusted] = useState<'all' | 'trusted' | 'learning'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterTrusted === 'trusted') params.set('isTrusted', 'true');
      if (filterTrusted === 'learning') params.set('isTrusted', 'false');

      const [devicesRes, statsRes] = await Promise.all([
        fetch(`${config.apiUrl}/super-admin/devices?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${config.apiUrl}/super-admin/devices/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!devicesRes.ok) throw new Error('Failed to load devices');
      const devicesData = await devicesRes.json();
      setDevices(devicesData.devices || []);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterTrusted]);

  const handleRevoke = async (deviceId: string) => {
    if (!token) return;
    if (!confirm('Revoke trust for this device? User will need OTP on next login.')) return;
    setActionLoading(deviceId);
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/devices/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) throw new Error('Failed to revoke device');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke device');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (deviceId: string) => {
    if (!token) return;
    if (!confirm('Deactivate this device completely? It will be hidden from listings.')) return;
    setActionLoading(deviceId);
    try {
      const res = await fetch(`${config.apiUrl}/super-admin/devices/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) throw new Error('Failed to deactivate device');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate device');
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (type?: string) => {
    if (type === 'mobile') return <Smartphone className="h-5 w-5" />;
    if (type === 'tablet') return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const renderUser = (userId: string | DeviceUser) => {
    if (typeof userId === 'object' && userId) {
      return (
        <div className="text-sm">
          <div className="font-medium">{userId.name || userId.email}</div>
          {userId.email && userId.name && <div className="text-xs text-muted-foreground">{userId.email}</div>}
          {userId.role && <Badge variant="outline" className="mt-1 text-[10px] capitalize">{userId.role}</Badge>}
        </div>
      );
    }
    return <span className="text-xs font-mono text-muted-foreground">{String(userId).slice(-8)}</span>;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            System Device Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor & control trusted devices across the entire SmartDuka platform
          </p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.total ?? '—'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{stats?.active ?? '—'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Trusted</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats?.trusted ?? '—'}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Learning</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{stats?.learning ?? '—'}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by device name, browser, OS, or IP…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadData(); }}
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filterTrusted === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterTrusted('all')}>All</Button>
              <Button variant={filterTrusted === 'trusted' ? 'default' : 'outline'} size="sm" onClick={() => setFilterTrusted('trusted')}>Trusted</Button>
              <Button variant={filterTrusted === 'learning' ? 'default' : 'outline'} size="sm" onClick={() => setFilterTrusted('learning')}>Learning</Button>
              <Button variant="outline" size="sm" onClick={loadData}>Search</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Devices ({devices.length})
          </CardTitle>
          <CardDescription>System-wide device fingerprints across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No devices match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Logins</th>
                    <th className="px-3 py-2">Last Active</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(d => (
                    <tr key={d._id} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">{getDeviceIcon(d.deviceType)}</div>
                          <div>
                            <div className="font-medium">{d.deviceName}</div>
                            <div className="text-xs text-muted-foreground">{[d.browser, d.os].filter(Boolean).join(' • ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{renderUser(d.userId)}</td>
                      <td className="px-3 py-3">
                        {d.isTrusted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Shield className="h-3 w-3 mr-1" />Trusted
                          </Badge>
                        ) : (
                          <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Learning</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{d.ipAddress || '—'}</td>
                      <td className="px-3 py-3 font-medium">{d.loginCount}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {d.lastLoginAt ? formatDistanceToNow(new Date(d.lastLoginAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {d.isTrusted && (
                            <Button
                              size="sm" variant="outline"
                              disabled={actionLoading === d._id}
                              onClick={() => handleRevoke(d._id)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            size="sm" variant="outline"
                            disabled={actionLoading === d._id}
                            onClick={() => handleDeactivate(d._id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
