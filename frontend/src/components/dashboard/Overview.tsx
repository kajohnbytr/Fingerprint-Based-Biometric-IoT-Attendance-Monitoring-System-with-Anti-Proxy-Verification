import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const attendanceData = [
  { name: 'Mon', present: 1100, absent: 100, late: 45 },
  { name: 'Tue', present: 1150, absent: 80, late: 15 },
  { name: 'Wed', present: 1080, absent: 140, late: 25 },
  { name: 'Thu', present: 1120, absent: 90, late: 35 },
  { name: 'Fri', present: 1050, absent: 150, late: 45 },
];

const pieData = [
  { name: 'Present', value: 1100, color: '#10b981' }, // emerald-500
  { name: 'Absent', value: 120, color: '#ef4444' }, // red-500
  { name: 'Late', value: 25, color: '#f59e0b' }, // amber-500
];

const radarData = [
  { subject: 'Math', A: 120, fullMark: 150 },
  { subject: 'Science', A: 98, fullMark: 150 },
  { subject: 'English', A: 86, fullMark: 150 },
  { subject: 'History', A: 99, fullMark: 150 },
  { subject: 'Physics', A: 85, fullMark: 150 },
  { subject: 'Geography', A: 65, fullMark: 150 },
];

export function Overview() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard Overview</h1>
        <p className="text-neutral-500">Welcome back, here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Students" 
          value="1,245" 
          trend="+2.5%" 
          trendUp={true} 
          icon={Users} 
          color="bg-blue-500"
        />
        <StatsCard 
          title="Present Today" 
          value="1,100" 
          trend="+4.1%" 
          trendUp={true} 
          icon={UserCheck} 
          color="bg-emerald-500"
        />
        <StatsCard 
          title="Absent Today" 
          value="120" 
          trend="-1.2%" 
          trendUp={false} 
          icon={UserX} 
          color="bg-red-500"
        />
        <StatsCard 
          title="Late Arrivals" 
          value="25" 
          trend="+0.5%" 
          trendUp={false} 
          icon={Clock} 
          color="bg-amber-500"
        />
      </div>

      {/* Charts Section 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Weekly attendance overview across all departments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>Status distribution for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section 2 & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
            <CardDescription>Average attendance by department</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                   <PolarGrid stroke="#e5e5e5" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#737373', fontSize: 12 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#737373" />
                   <Radar name="Attendance" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                   <Legend />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts & Anomalies</CardTitle>
            <CardDescription>Potential proxy detection and system alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-100">
                  <div className="p-2 bg-white rounded-full border border-red-100 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Proxy Attendance Detected</h4>
                    <p className="text-sm text-neutral-600 mt-1">
                      Multiple check-ins detected for Student ID #23901 from different locations within 5 minutes.
                    </p>
                    <p className="text-xs text-neutral-500 mt-2 font-medium">10 minutes ago</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="p-2 bg-white rounded-full border border-amber-100 shadow-sm">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900">Late Arrival Threshold Exceeded</h4>
                    <p className="text-sm text-neutral-600 mt-1">
                      Class 10-A has exceeded the 20% late arrival tolerance for today.
                    </p>
                    <p className="text-xs text-neutral-500 mt-2 font-medium">1 hour ago</p>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, trend, trendUp, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900">
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {trend}
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
