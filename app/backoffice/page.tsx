"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { maskMobile, maskEmail, formatDateFull } from '../lib/formatters';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
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
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      {/* Page Header (matches PageHeader styling on main dashboard) */}
      <div className="w-full bg-white dashboard-container pt-5 md:pt-7 pb-4 md:pb-6 border-b border-rcg-border/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[#1A0A10] tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2">
            <span>Client <span className="text-[#8B0A3D]">Management</span></span>
          </h1>
          <p className="text-xs sm:text-[13px] font-normal text-[#9B8A92] mt-1.5 sm:mt-2 font-sans">
            Manage client profiles and view individual dashboards
          </p>
        </div>
        <Link href="/backoffice/add" passHref>
          <Button className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Client
          </Button>
        </Link>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 dashboard-container py-4 md:py-6 w-full">
        <Card className="border-[#EDE0E6] bg-white overflow-hidden">
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
                <Link href="/backoffice/add" passHref>
                  <Button className="bg-[#8B0A3D] hover:bg-[#700832]">
                    <Plus className="w-4 h-4 mr-2" /> Add Your First Client
                  </Button>
                </Link>
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
                      <TableRow 
                        key={client.id} 
                        className="hover:bg-[#F3E8EC]/30 cursor-pointer transition-colors"
                        onClick={() => router.push(`/backoffice/client/${client.id}`)}
                      >
                        <TableCell className="font-medium text-[#1A0A10]">{client.name}</TableCell>
                        <TableCell className="text-[#6B4A58] font-mono text-sm">{maskMobile(client.mobile)}</TableCell>
                        <TableCell className="text-[#6B4A58] text-sm">{maskEmail(client.email)}</TableCell>
                        <TableCell className="text-[#6B4A58] text-sm">
                          {formatDateFull(client.created_at.split('T')[0])}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm py-1 px-2 h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id, client.name);
                            }}
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
      </main>

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
