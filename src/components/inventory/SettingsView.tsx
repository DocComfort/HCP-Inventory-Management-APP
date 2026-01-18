import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Users, 
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Smartphone
} from 'lucide-react';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'sync' | 'users'>('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure system preferences and integrations</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'sync', label: 'Sync Settings', icon: RefreshCw },
          { id: 'users', label: 'Users & Permissions', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1a365d] text-[#1a365d]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  id="company-name"
                  type="text"
                  defaultValue="ABC Service Company"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Email</label>
                <input
                  id="contact-email"
                  type="email"
                  defaultValue="admin@abcservice.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                <select defaultValue="America/New_York (EST)" aria-label="Time zone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option>America/New_York (EST)</option>
                  <option>America/Chicago (CST)</option>
                  <option>America/Denver (MST)</option>
                  <option>America/Los_Angeles (PST)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select defaultValue="USD ($)" aria-label="Currency" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option>USD ($)</option>
                  <option>CAD (C$)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Default Par Levels</h3>
            <p className="text-sm text-gray-500 mb-4">Set default min/max par levels for new items</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Warehouse Defaults</h4>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Min Par</label>
                    <input
                      type="number"
                      defaultValue={50}
                      aria-label="Warehouse minimum par level"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Max Par</label>
                    <input
                      type="number"
                      defaultValue={100}
                      aria-label="Warehouse maximum par level"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Van Defaults</h4>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Min Par</label>
                    <input
                      type="number"
                      defaultValue={5}
                      aria-label="Van minimum par level"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Max Par</label>
                    <input
                      type="number"
                      defaultValue={15}
                      aria-label="Van maximum par level"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              {[
                { label: 'Low stock alerts', desc: 'When items fall below par level' },
                { label: 'Transfer requests', desc: 'When new transfers need approval' },
                { label: 'Purchase orders', desc: 'When POs are created or need approval' },
                { label: 'Sync errors', desc: 'When integration sync fails' },
                { label: 'Daily summary', desc: 'Daily inventory status report' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={idx < 4} className="sr-only peer" aria-label={`Enable ${item.label}`} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Push Notifications</h3>
            <div className="space-y-4">
              {[
                { label: 'Critical alerts', desc: 'Urgent stock issues and sync failures' },
                { label: 'Approval requests', desc: 'Transfers and POs needing immediate action' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" aria-label={`Enable ${item.label}`} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sync Settings */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Sync Intervals</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Housecall Pro Sync</p>
                  <p className="text-sm text-gray-500">How often to pull invoices and work orders</p>
                </div>
                <select aria-label="Housecall Pro sync interval" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option value="30">Every 30 seconds</option>
                  <option value="60" selected>Every 60 seconds</option>
                  <option value="300">Every 5 minutes</option>
                  <option value="600">Every 10 minutes</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">QuickBooks Sync</p>
                  <p className="text-sm text-gray-500">How often to sync inventory with QuickBooks</p>
                </div>
                <select aria-label="QuickBooks sync interval" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option value="60">Every 60 seconds</option>
                  <option value="300" selected>Every 5 minutes</option>
                  <option value="600">Every 10 minutes</option>
                  <option value="1800">Every 30 minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Conflict Resolution</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block font-medium text-gray-900 mb-2">When inventory counts differ</label>
                <select aria-label="Inventory count conflict resolution" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option>Use Housecall Pro as source of truth</option>
                  <option>Use QuickBooks as source of truth</option>
                  <option>Use the higher count</option>
                  <option>Use the lower count</option>
                  <option>Flag for manual review</option>
                </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block font-medium text-gray-900 mb-2">When item names differ</label>
                <select aria-label="Item name conflict resolution" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option>Use Housecall Pro name</option>
                  <option>Use QuickBooks name</option>
                  <option>Flag for manual review</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">QuickBooks Desktop Note</h4>
                <p className="text-sm text-amber-700 mt-1">
                  QuickBooks Desktop requires a middleware bridge (like Autymate or MyWorks) for cloud connectivity. 
                  Ensure your bridge application is running and properly configured for sync to work.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users & Permissions */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Team Members</h3>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1a365d] text-white rounded-lg text-sm hover:bg-[#1a365d]/90 transition-colors">
                <Users className="w-4 h-4" />
                Invite User
              </button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Admin User', email: 'admin@abcservice.com', role: 'Administrator' },
                { name: 'John Manager', email: 'john@abcservice.com', role: 'Manager' },
                { name: 'Sarah Dispatch', email: 'sarah@abcservice.com', role: 'Dispatcher' }
              ].map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1a365d] rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select 
                      defaultValue={user.role}
                      aria-label="User role"
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                    >
                      <option>Administrator</option>
                      <option>Manager</option>
                      <option>Dispatcher</option>
                      <option>Viewer</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="text-left pb-3">Permission</th>
                    <th className="text-center pb-3">Admin</th>
                    <th className="text-center pb-3">Manager</th>
                    <th className="text-center pb-3">Dispatcher</th>
                    <th className="text-center pb-3">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { perm: 'View inventory', admin: true, manager: true, dispatch: true, viewer: true },
                    { perm: 'Edit inventory', admin: true, manager: true, dispatch: false, viewer: false },
                    { perm: 'Approve transfers', admin: true, manager: true, dispatch: false, viewer: false },
                    { perm: 'Create POs', admin: true, manager: true, dispatch: true, viewer: false },
                    { perm: 'Approve POs', admin: true, manager: true, dispatch: false, viewer: false },
                    { perm: 'Manage integrations', admin: true, manager: false, dispatch: false, viewer: false },
                    { perm: 'Manage users', admin: true, manager: false, dispatch: false, viewer: false }
                  ].map((row, idx) => (
                    <tr key={idx} className="text-sm">
                      <td className="py-3 text-gray-900">{row.perm}</td>
                      <td className="py-3 text-center">
                        {row.admin ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-center">
                        {row.manager ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-center">
                        {row.dispatch ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-center">
                        {row.viewer ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
