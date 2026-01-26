import React, { useState, useEffect } from 'react';
import { X, Truck, Warehouse, User, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface Employee {
  employee_id: string;
  employee_name: string;
  employee_email?: string;
  role?: string;
  is_primary?: boolean;
}

interface Location {
  id?: string;
  name: string;
  type: 'warehouse' | 'van' | 'office';
  address?: string;
  is_active: boolean;
  technician_name?: string;
  technician_id?: string;
  location_employees?: Employee[];
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Location) => void;
  location?: Location | null;
  type: 'warehouse' | 'van';
}

export default function LocationModal({ isOpen, onClose, onSave, location, type }: LocationModalProps) {
  const [formData, setFormData] = useState<Location>({
    name: '',
    type: type,
    address: '',
    is_active: true,
    technician_name: '',
    technician_id: ''
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    if (location) {
      setFormData({
        ...location,
        type: type
      });
      setEmployees(location.location_employees || []);
    } else {
      setFormData({
        name: '',
        type: type,
        address: '',
        is_active: true,
        technician_name: '',
        technician_id: ''
      });
      setEmployees([]);
    }
  }, [location, type]);

  useEffect(() => {
    // Fetch available HCP employees
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/locations/hcp/employees`, {
          headers: {
            'x-integrations-key': import.meta.env.VITE_INTEGRATIONS_KEY || ''
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableEmployees(data.employees || []);
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      }
    };
    
    if (isOpen && type === 'van') {
      fetchEmployees();
    }
  }, [isOpen, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = location?.id 
        ? `${API_BASE_URL}/api/locations/${location.id}`
        : `${API_BASE_URL}/api/locations`;
      
      const method = location?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-integrations-key': import.meta.env.VITE_INTEGRATIONS_KEY || ''
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // If this is a van, also update employee assignments
        if (type === 'van' && data.location?.id) {
          for (const emp of employees) {
            await fetch(`${API_BASE_URL}/api/locations/${data.location.id}/employees`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-integrations-key': import.meta.env.VITE_INTEGRATIONS_KEY || ''
              },
              body: JSON.stringify(emp)
            });
          }
        }

        toast.success(location?.id ? `${type === 'warehouse' ? 'Warehouse' : 'Van'} updated!` : `${type === 'warehouse' ? 'Warehouse' : 'Van'} created!`);
        onSave(data.location);
        onClose();
      } else {
        toast.error(data.message || 'Failed to save');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    const selected = availableEmployees.find(e => e.id === selectedEmployeeId);
    if (selected && !employees.find(e => e.employee_id === selected.id)) {
      setEmployees([...employees, {
        employee_id: selected.id,
        employee_name: `${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.email,
        employee_email: selected.email,
        role: selected.role || 'Technician',
        is_primary: employees.length === 0
      }]);
      setSelectedEmployeeId('');
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployees(employees.filter(e => e.employee_id !== employeeId));
  };

  const handleSetPrimary = (employeeId: string) => {
    setEmployees(employees.map(e => ({
      ...e,
      is_primary: e.employee_id === employeeId
    })));
  };

  if (!isOpen) return null;

  const Icon = type === 'warehouse' ? Warehouse : Truck;
  const title = location?.id 
    ? `Edit ${type === 'warehouse' ? 'Warehouse' : 'Van'}` 
    : `Add ${type === 'warehouse' ? 'Warehouse' : 'Van'}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              type === 'warehouse' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              <Icon className={`w-5 h-5 ${type === 'warehouse' ? 'text-blue-600' : 'text-purple-600'}`} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={type === 'warehouse' ? 'Main Warehouse' : 'Van #1 - John Smith'}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St, City, State 12345"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]/20"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (visible in the system)
            </label>
          </div>

          {/* Van-specific: Employee Assignment */}
          {type === 'van' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assigned Employees
              </label>
              
              {/* Add Employee */}
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
                >
                  <option value="">Select employee to add...</option>
                  {availableEmployees
                    .filter(e => !employees.find(emp => emp.employee_id === e.id))
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} - {emp.email}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  disabled={!selectedEmployeeId}
                  className="px-3 py-2 bg-[#1a365d] text-white rounded-lg disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Employee List */}
              <div className="space-y-2">
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg">
                    No employees assigned to this van
                  </p>
                ) : (
                  employees.map((emp) => (
                    <div key={emp.employee_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{emp.employee_name}</p>
                        <p className="text-xs text-gray-500">{emp.employee_email}</p>
                      </div>
                      {emp.is_primary ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Primary</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(emp.employee_id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmployee(emp.employee_id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 disabled:opacity-50"
            >
              {loading ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {location?.id ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
