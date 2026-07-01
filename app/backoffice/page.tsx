"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maskMobile, maskEmail, formatDateFull } from '../lib/formatters';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Users, Plus, Eye, Trash2, Loader2 } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  mobile: string;
  email: string;
  created_at: string;
}

export default function BackofficePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch clients');
      }
      setClients(data.clients || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client ${name} and all their data?`)) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4F6] pb-24">
      {/* Header section matching existing theme spacing */}
      <div className="bg-[#8B0A3D] text-white pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans tracking-tight">Client Management</h1>
            <p className="text-white/80 text-sm mt-1">Manage client profiles and view individual dashboards</p>
          </div>
          <Button 
            onClick={() => router.push('/backoffice/add')}
            className="bg-white text-[#8B0A3D] hover:bg-white/90 font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 -mt-8 relative z-10">
        <Card className="shadow-lg border-[#EDE0E6]">
          <CardHeader className="bg-white border-b border-[#EDE0E6] pb-4">
            <CardTitle className="text-[#1A0A10] flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-[#8B0A3D]" /> All Clients
            </CardTitle>
            <CardDescription>
              {clients.length} active client{clients.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#9B8A92]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B0A3D] mb-4" />
                <p>Loading clients...</p>
              </div>
            ) : error ? (
              <div className="py-12 flex flex-col items-center justify-center text-red-600">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchClients}>Retry</Button>
              </div>
            ) : clients.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-[#F3E8EC] rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-[#8B0A3D]" />
                </div>
                <h3 className="text-lg font-bold text-[#1A0A10]">No clients yet</h3>
                <p className="text-[#6B4A58] mt-1 max-w-sm mb-6">
                  Get started by adding your first client and uploading their trading data.
                </p>
                <Button onClick={() => router.push('/backoffice/add')} className="bg-[#8B0A3D] hover:bg-[#700832]">
                  <Plus className="w-4 h-4 mr-2" /> Add Your First Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F8F4F6]/50">
                    <TableRow>
                      <TableHead className="font-semibold text-[#1A0A10]">Name</TableHead>
                      <TableHead className="font-semibold text-[#1A0A10]">Mobile</TableHead>
                      <TableHead className="font-semibold text-[#1A0A10]">Email</TableHead>
                      <TableHead className="font-semibold text-[#1A0A10]">Added On</TableHead>
                      <TableHead className="text-right font-semibold text-[#1A0A10]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-[#F3E8EC]/30">
                        <TableCell className="font-medium text-[#1A0A10]">{client.name}</TableCell>
                        <TableCell className="text-[#6B4A58] font-mono text-sm">{maskMobile(client.mobile)}</TableCell>
                        <TableCell className="text-[#6B4A58] text-sm">{maskEmail(client.email)}</TableCell>
                        <TableCell className="text-[#6B4A58] text-sm">
                          {formatDateFull(client.created_at.split('T')[0])}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="outline" 
                            className="border-[#8B0A3D]/20 text-[#8B0A3D] hover:bg-[#8B0A3D]/5 text-sm py-1 px-3 h-8"
                            onClick={() => router.push(`/backoffice/client/${client.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-1 px-2 h-8"
                            onClick={() => handleDelete(client.id, client.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
