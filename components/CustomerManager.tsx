
import React, { useState } from 'react';
import { CustomerDefinition, SystemSettings } from '../types';
import { Users as UsersIcon, Trash2, Plus, Edit2, Save, Hash } from 'lucide-react';
import { FeatureGate } from './FeatureGate';

interface CustomerManagerProps {
  customers: CustomerDefinition[];
  onAddCustomer: (customer: Omit<CustomerDefinition, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<CustomerDefinition>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  features: SystemSettings;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  features
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<Partial<CustomerDefinition>>({});

  const handleEditCustomer = (customer: CustomerDefinition) => {
    setCustomerForm(customer);
    setEditingId(customer.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.name) return;
    if (editingId) {
      await onUpdateCustomer(editingId, customerForm);
      setEditingId(null);
    } else {
      await onAddCustomer(customerForm as CustomerDefinition);
    }
    setCustomerForm({});
  };

  const cancelCustomerEdit = () => {
    setCustomerForm({});
    setEditingId(null);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const inputClass = "w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-slate-400";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1";
  const thClass = "px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 first:pl-8 last:pr-8";
  const tdClass = "px-6 py-4 text-sm border-b border-slate-100 group-last:border-0 first:pl-8 last:pr-8 align-middle";

  return (
    <FeatureGate isEnabled={features.enableCustomerDatabase ?? true}>
        <div className="max-w-6xl mx-auto p-4 lg:p-8 pb-32 animate-in fade-in duration-300">
            <header className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Customer Management</h1>
                <p className="text-slate-500 mt-1">Manage client database, billing IDs, and contact info.</p>
            </header>

            <div className="space-y-6">
                {/* Input Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {editingId ? (
                                <><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded"><Edit2 size={16}/></div> Edit Customer</>
                            ) : (
                                <><div className="p-1.5 bg-indigo-100 text-indigo-600 rounded"><Plus size={16}/></div> Add New Customer</>
                            )}
                        </h3>
                        {editingId && (
                            <button onClick={cancelCustomerEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase">Cancel Edit</button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end relative z-10">
                        <div className="md:col-span-6">
                            <label className={labelClass}>Customer Name</label>
                            <input placeholder="Company or Individual Name" className={inputClass} value={customerForm.name || ''} onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="md:col-span-4">
                            <label className={labelClass}>Customer ID</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input placeholder="e.g. 2750" className={`${inputClass} pl-10 font-mono`} value={customerForm.customerId || ''} onChange={e => setCustomerForm(p => ({ ...p, customerId: e.target.value }))} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <button onClick={handleSaveCustomer} className={`w-full h-[46px] rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'}`}>
                                {editingId ? <><Save size={18} /> Update</> : <><Plus size={18} /> Add</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th className={thClass}>Customer Name</th>
                                <th className={thClass}>Customer ID</th>
                                <th className={`${thClass} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(customer => (
                                <tr key={customer.id} className="group hover:bg-indigo-50/50 transition-colors bg-white">
                                    <td className={tdClass}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm group-hover:bg-indigo-100 transition-colors">
                                                {getInitials(customer.name)}
                                            </div>
                                            <span className="font-bold text-slate-800 text-sm">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className={tdClass}>
                                        {customer.customerId ? (
                                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shadow-sm">#{customer.customerId}</span>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">No ID</span>
                                        )}
                                    </td>
                                    <td className={`${tdClass} text-right`}>
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleEditCustomer(customer)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => onDeleteCustomer(customer.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                                        <UsersIcon size={24} className="opacity-50 mx-auto mb-3" />
                                        <p>No Customers Found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </FeatureGate>
  );
};
