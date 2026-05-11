'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSuperAdminActivity } from '@/hooks/use-super-admin-activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Users, Store, Clock, TrendingUp, AlertCircle, RefreshCw, Eye, Filter, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityStats {
  totalActiveShops: number;
  totalActiveUsers: number;
  totalLoginsToday: number;
  totalLoginsThisWeek: number;
  topActiveShops: ShopActivity[];
  recentLogins: LoginEntry[];
  loginMethodStats: {
    password: number;
    google: number;
    pin: number;
  };
}

interface ShopActivity {
  shopId: string;
  shopName: string;
  email: string;
  status: 'active' | 'idle' | 'offline';
  lastLogin: string;
  activeUsers: number;
  totalUsers: number;
  recentLogins: number;
}

interface LoginEntry {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  email: string;
  name: string;
  role: string;
  shopName: string;
  loginMethod: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface ActiveSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  shopId: string;
  shopName: string;
  sessionId: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const {
    stats,
    shopActivities,
    activeSessions,
    isConnected,
    lastUpdate,
    error,
    refreshData,
  } = useSuperAdminActivity();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleRefresh = async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 2000);
  };

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      return;
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLoginMethodColor = (method: string) => {
    switch (method) {
      case 'google':
        return 'bg-blue-100 text-blue-800';
      case 'password':
        return 'bg-purple-100 text-purple-800';
      case 'pin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredShops = shopActivities.filter(shop => {
    const matchesSearch = shop.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shop.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || shop.status === filterStatus;
    const matchesShop = selectedShop === 'all' || shop.shopId === selectedShop;
    return matchesSearch && matchesStatus && matchesShop;
  });

  const filteredSessions = activeSessions.filter(session => {
    const matchesSearch = session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.shopName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = selectedShop === 'all' || session.shopId === selectedShop;
    return matchesSearch && matchesShop;
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-gray-600">Real-time system activity monitoring</p>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Disconnected</span>
                </>
              )}
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last update: {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActiveShops}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActiveUsers}</div>
              <p className="text-xs text-muted-foreground">Logged in now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logins Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoginsToday}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logins This Week</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLoginsThisWeek}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Login Method Stats */}
      {stats && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Login Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Google OAuth</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">{stats.loginMethodStats.google}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">Password</span>
                </div>
                <Badge className="bg-purple-100 text-purple-800">{stats.loginMethodStats.password}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="font-medium">PIN</span>
                </div>
                <Badge className="bg-orange-100 text-orange-800">{stats.loginMethodStats.pin}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search shops, users, or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by shop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shopActivities.map((shop) => (
                  <SelectItem key={shop.shopId} value={shop.shopId}>
                    {shop.shopName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="shops" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shops">Shop Activities</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="logins">Recent Logins</TabsTrigger>
        </TabsList>

        {/* Shop Activities Tab */}
        <TabsContent value="shops">
          <Card>
            <CardHeader>
              <CardTitle>Shop Activity Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active Users</TableHead>
                    <TableHead>Total Users</TableHead>
                    <TableHead>Recent Logins</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.map((shop) => (
                    <TableRow key={shop.shopId}>
                      <TableCell className="font-medium">{shop.shopName}</TableCell>
                      <TableCell>{shop.email}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(shop.status)}>
                          {shop.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {shop.activeUsers}
                        </div>
                      </TableCell>
                      <TableCell>{shop.totalUsers}</TableCell>
                      <TableCell>{shop.recentLogins}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(shop.lastLogin), { addSuffix: true })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active User Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell className="font-medium">{session.name}</TableCell>
                      <TableCell>{session.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.role}</Badge>
                      </TableCell>
                      <TableCell>{session.shopName}</TableCell>
                      <TableCell className="text-sm">{session.deviceInfo || 'Unknown'}</TableCell>
                      <TableCell className="text-sm font-mono">{session.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Logins Tab */}
        <TabsContent value="logins">
          <Card>
            <CardHeader>
              <CardTitle>Recent Login History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.recentLogins?.map((login) => (
                    <TableRow key={login._id}>
                      <TableCell className="font-medium">{login.name}</TableCell>
                      <TableCell>{login.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{login.role}</Badge>
                      </TableCell>
                      <TableCell>{login.shopName}</TableCell>
                      <TableCell>
                        <Badge className={getLoginMethodColor(login.loginMethod)}>
                          {login.loginMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={login.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {login.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{login.ipAddress || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(login.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
