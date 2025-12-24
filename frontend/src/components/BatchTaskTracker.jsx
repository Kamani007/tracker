import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import Navigation from "./Navigation";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071";

const BatchTaskTracker = () => {
  const [batches, setBatches] = useState([]);
  const [processOptions, setProcessOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBatchName, setNewBatchName] = useState("");
  const [newProcess, setNewProcess] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [deleteBatch, setDeleteBatch] = useState(null);

  // Fetch options
  useEffect(() => {
    fetchOptions();
  }, []);

  // Fetch batches
  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/batch-processes/options`);
      const result = await response.json();
      if (result.success) {
        setProcessOptions(result.processes);
        setStatusOptions(result.statuses);
      }
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/batch-processes`);
      const result = await response.json();
      if (result.success) {
        setBatches(result.data);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async () => {
    if (!newBatchName || !newProcess || !newStatus) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/batch-processes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          batch_name: newBatchName, 
          current_process: newProcess, 
          status: newStatus 
        }),
      });

      const result = await response.json();
      if (result.success) {
        setNewBatchName("");
        setNewProcess("");
        setNewStatus("");
        fetchBatches();
      } else {
        alert(result.error || "Failed to add batch");
      }
    } catch (error) {
      console.error("Error adding batch:", error);
      alert("Failed to add batch");
    }
  };

  const handleUpdateProcess = async (batchName, field, value) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/batch-processes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          batch_name: batchName, 
          [field]: value 
        }),
      });

      const result = await response.json();
      if (result.success) {
        fetchBatches();
      } else {
        alert(result.error || "Failed to update batch");
      }
    } catch (error) {
      console.error("Error updating batch:", error);
      alert("Failed to update batch");
    }
  };

  const handleDelete = async (batchName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/batch-processes?batch_name=${encodeURIComponent(batchName)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (result.success) {
        fetchBatches();
        setDeleteBatch(null);
      } else {
        alert(result.error || "Failed to delete batch");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Failed to delete batch");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Done":
        return "bg-green-500";
      case "Work in progress":
        return "bg-yellow-400 text-black";
      case "To be started":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark">
        <Navigation />
        <div className="container mx-auto p-6 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Batch Process Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Batch */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Batch Name</label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g., Batch 82 - Testing"
                  className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md"
                />
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Current Process</label>
                <select
                  value={newProcess}
                  onChange={(e) => setNewProcess(e.target.value)}
                  className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md"
                >
                  <option value="">Select process</option>
                  {processOptions.map((process) => (
                    <option key={process} value={process}>
                      {process}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md"
                >
                  <option value="">Select status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={handleAddBatch} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Batch
              </Button>
            </div>

            {/* Batch Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-semibold">Batch Name</th>
                    <th className="text-left p-4 font-semibold">Current Process</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Last Updated</th>
                    <th className="text-center p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center p-8 text-muted-foreground">
                        No batches yet. Add your first batch above.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.batch_name} className="border-t hover:bg-muted/50">
                        <td className="p-4">
                          <div className="px-4 py-2 bg-orange-500 text-white rounded-lg inline-block font-medium">
                            {batch.batch_name}
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={batch.current_process}
                            onChange={(e) => handleUpdateProcess(batch.batch_name, 'current_process', e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md"
                          >
                            {processOptions.map((process) => (
                              <option key={process} value={process}>
                                {process}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={batch.status}
                            onChange={(e) => handleUpdateProcess(batch.batch_name, 'status', e.target.value)}
                            className={`w-full p-2 ${getStatusColor(batch.status)} border-none text-white font-semibold rounded-lg cursor-pointer`}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="px-4 py-2 bg-slate-500 text-white rounded-lg inline-block">
                            {batch.last_updated}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteBatch(batch.batch_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBatch} onOpenChange={() => setDeleteBatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteBatch}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteBatch)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BatchTaskTracker;
