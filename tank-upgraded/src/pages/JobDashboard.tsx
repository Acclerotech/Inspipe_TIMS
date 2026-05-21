import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FileText, AlertCircle, CheckCircle, Clock, RefreshCw, Plus } from 'lucide-react';
import { ingestionApi } from '../services/api'; 

export default function JobDashboard() {
  const navigate = useNavigate();

  // Fetch Jobs
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['ingestion-jobs'],
    queryFn: () => ingestionApi.getJobs(0, 50),
  });

  // Retry Mutation
  const retryMut = useMutation({
    mutationFn: (jobId: string | number) => ingestionApi.retryJob(jobId),
    onSuccess: (data, variables) => {
      // Navigate to upload wizard with the jobId in the URL
      navigate(`/upload?jobId=${variables}`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMMITTED':
        return <span className="flex items-center gap-1 w-max text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"><CheckCircle className="w-3 h-3" /> Committed</span>;
      case 'FAILED':
        return <span className="flex items-center gap-1 w-max text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200"><AlertCircle className="w-3 h-3" /> Failed</span>;
      case 'UPLOADED':
      case 'MAPPING':
      case 'VALIDATED':
        return <span className="flex items-center gap-1 w-max text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200"><Clock className="w-3 h-3" /> {status}</span>;
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="p-5 animate-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Ingestion Jobs</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor data uploads and resolve mapping or validation failures.</p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Upload
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">Failed to load jobs.</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Job ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Tank & Technique</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Source File</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-slate-400">Loading jobs...</td></tr>
            ) : !jobs || jobs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-slate-400">No jobs found.</td></tr>
            ) : (
              jobs.map((job: any) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">#{job.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold">{job.tankId || 'Unknown'}</span> <span className="text-slate-400">·</span> {job.technique}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" /> {job.sourceFilename}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {job.status === 'FAILED' && (
                      <button 
                        onClick={() => retryMut.mutate(job.id)}
                        disabled={retryMut.isPending && retryMut.variables === job.id}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-end ml-auto"
                      >
                        <RefreshCw className={`w-3 h-3 ${retryMut.isPending && retryMut.variables === job.id ? 'animate-spin' : ''}`} />
                        Retry Mapping
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}