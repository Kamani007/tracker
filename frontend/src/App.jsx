"use client"

import { useState, useEffect, useRef } from "react"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Plus, Menu, Trash2, Edit } from "lucide-react"
import { todayAPI, yesterdayAPI, safetyAPI, kudosAPI, healthAPI, resetAPI, batchAPI, API_BASE_URL } from "@/lib/api"
import { dataCache } from "@/lib/cache"
import ParameterChart from "@/components/ParameterChart"
import DeviceYieldChart from "@/components/DeviceYieldChart"
import PCEStdDevChart from "@/components/PCEStdDevChart"
import IVRepeatabilityChart from "@/components/IVRepeatabilityChart"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import UploadData from "@/components/UploadData"
import Analysis from "@/components/Analysis"
import StabilityDashboard from "@/components/StabilityDashboard_New"
import StabilityHistory from "@/components/StabilityHistory"
import { checkAuthentication, logout as azureLogout } from "@/lib/azureAuth"
import AllData from "@/components/AllData"
import MorningMeetings from "@/components/MorningMeetings"
import TrackProgress from "@/components/TrackProgress"
import BaselineBatches from "@/components/baseline-batches"
import BatchTaskTracker from "@/components/BatchTaskTracker"

// Sample data
const processData = [
  {
    process: "Wafer Prep",
    cycleTime: "2.5h",
    outs: "Batch 12 (45)",
    wip: "Batch 13 (48)",
    yield: "98.2%",
    date: "12/23",
  },
  {
    process: "Lithography",
    cycleTime: "4.2h",
    outs: "Batch 11 (42)",
    wip: "Batch 12 (45)",
    yield: "96.8%",
    date: "12/23",
  },
  { process: "Etching", cycleTime: "3.1h", outs: "Batch 10 (48)", wip: "Batch 11 (42)", yield: "97.5%", date: "12/23" },
  {
    process: "Deposition",
    cycleTime: "5.8h",
    outs: "Batch 9 (44)",
    wip: "Batch 10 (48)",
    yield: "99.1%",
    date: "12/23",
  },
  {
    process: "Ion Implant",
    cycleTime: "2.8h",
    outs: "Batch 8 (46)",
    wip: "Batch 9 (44)",
    yield: "98.7%",
    date: "12/23",
  },
  { process: "Annealing", cycleTime: "6.2h", outs: "Batch 7 (43)", wip: "Batch 8 (46)", yield: "99.3%", date: "12/23" },
  { process: "Metrology", cycleTime: "1.5h", outs: "Batch 6 (47)", wip: "Batch 7 (43)", yield: "97.9%", date: "12/23" },
  { process: "CMP", cycleTime: "4.5h", outs: "Batch 5 (41)", wip: "Batch 6 (47)", yield: "96.4%", date: "12/23" },
  { process: "Packaging", cycleTime: "3.7h", outs: "Batch 4 (49)", wip: "Batch 5 (41)", yield: "98.8%", date: "12/23" },
  {
    process: "Final Test",
    cycleTime: "2.2h",
    outs: "Batch 3 (45)",
    wip: "Batch 4 (49)",
    yield: "99.5%",
    date: "12/23",
  },
]

const safetyIssues = [
  {
    issue: "Chemical spill in clean room",
    person: "Sarah Chen",
    action: "Containment protocol initiated",
    date: "12/23",
  },
  { issue: "Equipment overheating alert", person: "Mike Rodriguez", action: "Maintenance scheduled", date: "12/23" },
  { issue: "PPE compliance check", person: "Lisa Wang", action: "Training session planned", date: "12/22" },
]

const kudosData = [
  { name: "Alex Thompson", action: "Improved yield by 2% through process optimization", date: "12/23" },
  { name: "Maria Garcia", action: "Prevented downtime with proactive maintenance", date: "12/23" },
  { name: "David Kim", action: "Mentored new team members effectively", date: "12/22" },
  { name: "Jennifer Liu", action: "Streamlined quality control procedures", date: "12/22" },
]

const yesterdayIssues = [
  { item: "Tool 1", description: "Calibration drift detected", done: "No", who: "Tech Team A", date: "12/22" },
  { item: "Tool 2", description: "Temperature variance", done: "Yes", who: "Tech Team B", date: "12/22" },
  { item: "Tool 3", description: "Pressure sensor fault", done: "No", who: "Tech Team C", date: "12/22" },
  { item: "Tool 4", description: "Software update required", done: "Yes", who: "IT Team", date: "12/22" },
]

const todayIssues = [
  { item: "Tool 5", description: "Routine maintenance due", who: "Tech Team A", date: "12/23", done: "No" },
  { item: "Tool 6", description: "Performance monitoring", who: "Tech Team B", date: "12/23", done: "Yes" },
  { item: "Tool 7", description: "Quality check pending", who: "QA Team", date: "12/23", done: "No" },
]

// Chart data
const yieldData = [
  { time: "00:00", yield: 97.2 },
  { time: "04:00", yield: 97.8 },
  { time: "08:00", yield: 96.5 },
  { time: "12:00", yield: 98.1 },
  { time: "16:00", yield: 97.9 },
  { time: "20:00", yield: 98.3 },
]

const repeatabilityData = [
  { time: "00:00", value: 2.1 },
  { time: "04:00", value: 2.3 },
  { time: "08:00", value: 1.9 },
  { time: "12:00", value: 2.2 },
  { time: "16:00", value: 2.0 },
  { time: "20:00", value: 2.1 },
]

export default function ProductionDashboard() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // State for API data
  const [todayIssues, setTodayIssues] = useState([])
  const [yesterdayIssues, setYesterdayIssues] = useState([])
  const [safetyIssues, setSafetyIssues] = useState([])
  const [kudosData, setKudosData] = useState([])
  const [batchData, setBatchData] = useState([])
  const [batchPriorities, setBatchPriorities] = useState({})
  const [batchTasks, setBatchTasks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('checking')

  // Form states
  const [newSafetyIssue, setNewSafetyIssue] = useState({ issue: "", person: "", action: "" })
  const [isAddingIssue, setIsAddingIssue] = useState(false)

  const [newKudos, setNewKudos] = useState({ name: "", action: "", by_whom: "" })
  const [isAddingKudos, setIsAddingKudos] = useState(false)

  const [newTodayIssue, setNewTodayIssue] = useState({ description: "", who: "" })
  const [isAddingTodayIssue, setIsAddingTodayIssue] = useState(false)

  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [showOnlyIncompleteSafety, setShowOnlyIncompleteSafety] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // For manual refresh only

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // This works for both local (localStorage) and Azure SWA (/.auth/me)
      const isAuth = await checkAuthentication()
      setIsAuthenticated(isAuth)
      setIsCheckingAuth(false)
      // If not authenticated, we don't need to show loading spinner
      if (!isAuth) {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Load data from API
  useEffect(() => {
    if (isAuthenticated) {
      loadData()
      checkApiHealth()
    }
  }, [isAuthenticated])

  const checkApiHealth = async () => {
    try {
      await healthAPI.check()
      setApiStatus('connected')
    } catch (err) {
      setApiStatus('disconnected')
      console.error('API health check failed:', err)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [todayResponse, yesterdayResponse, safetyData, kudosEntries, batches, priorities, batchProcesses] = await Promise.all([
        todayAPI.getAll(),
        yesterdayAPI.getAll(),
        safetyAPI.getAll(),
        kudosAPI.getAll(),
        batchAPI.getCurrentLocation(),
        batchAPI.getPriorities(),
        fetch(`${API_BASE_URL}/batch-processes`).then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ])
      
      // Extract data arrays from API responses
      const todayData = todayResponse.data || todayResponse;
      const yesterdayData = yesterdayResponse.data || yesterdayResponse;
      
      // Save batch location snapshot to MongoDB for historical tracking
      if (batches && batches.length > 0) {
        try {
          await batchAPI.saveLocationSnapshot(batches);
          console.log('✅ Batch location snapshot saved');
        } catch (err) {
          console.warn('Failed to save batch location snapshot:', err);
        }
      }
      
      // Map API data to frontend format
      const mappedTodayData = todayData.map(item => ({
        id: item.id,
        sr_no: item.id,
        item: `Issue ${item.id}`,
        description: item.description,
        who: item.who,
        date: item.date,
        _id: item._id
      }))

      const mappedYesterdayData = yesterdayData.map(item => ({
        id: item.id,
        sr_no: item.id,
        item: `Issue ${item.id}`,
        description: item.description,
        who: item.who,
        done: item.done,
        date: item.date,
        _id: item._id
      }))

      setTodayIssues(mappedTodayData)
      setYesterdayIssues(mappedYesterdayData)
      setSafetyIssues(safetyData) // Load all safety issues, filtering handled in getFilteredSafetyIssues
      setKudosData(kudosEntries)
      
      // Merge batch data with task data
      const taskMap = {}
      if (batchProcesses.success && batchProcesses.data) {
        batchProcesses.data.forEach(task => {
          taskMap[task.batch_name] = {
            current_process: task.current_process,
            task_status: task.status,
            last_updated: task.last_updated
          }
        })
      }
      
      const mergedBatches = (batches || []).map(batch => ({
        ...batch,
        ...taskMap[batch.batch_number || batch.batch_id]
      }))
      
      setBatchData(mergedBatches)
      setBatchPriorities(priorities?.data || {})
      
      setError(null)
    } catch (err) {
      setError('Failed to load data: ' + err.message)
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle "Refresh All Data" button - clears cache and forces reload
  const handleRefreshAll = async () => {
    console.log('🔄 Manual refresh triggered - clearing ALL caches...');
    setLoading(true)
    try {
      // 1. Clear frontend SESSION cache (instant)
      dataCache.clear();
      console.log('✅ Frontend SESSION cache cleared');
      
      // 2. Clear backend MongoDB caches
      await fetch(`${API_BASE_URL}/clear-all-data-cache`, { method: 'POST' });
      console.log('✅ Backend MongoDB caches cleared');
      
      // 3. Force chart components to remount and refetch fresh data from Azure
      setRefreshKey(prev => prev + 1);
      
      // 4. Reload page data
      await loadData();
    } catch (err) {
      console.error('Failed to refresh:', err);
      setError('Failed to refresh data: ' + err.message);
      setLoading(false);
    }
  }

  // Individual loading functions for targeted refreshes
  const loadSafetyIssues = async () => {
    try {
      const safetyData = await safetyAPI.getAll()
      setSafetyIssues(safetyData) // Load all safety issues, filtering handled in getFilteredSafetyIssues
    } catch (err) {
      console.error('Failed to load safety issues:', err)
    }
  }

  const loadKudos = async () => {
    try {
      const kudosEntries = await kudosAPI.getAll()
      setKudosData(kudosEntries)
    } catch (err) {
      console.error('Failed to load kudos:', err)
    }
  }

  const loadTodayIssues = async () => {
    try {
      const todayResponse = await todayAPI.getAll()
      const todayData = todayResponse.data || todayResponse;
      const mappedTodayData = todayData.map(item => ({
        id: item.id,
        sr_no: item.id,
        item: `Issue ${item.id}`,
        description: item.description,
        who: item.who,
        date: item.date,
        _id: item._id
      }))
      setTodayIssues(mappedTodayData)
    } catch (err) {
      console.error('Failed to load today issues:', err)
    }
  }

  const loadYesterdayIssues = async () => {
    try {
      const yesterdayResponse = await yesterdayAPI.getAll()
      const yesterdayData = yesterdayResponse.data || yesterdayResponse;
      const mappedYesterdayData = yesterdayData.map(item => ({
        id: item.id,
        sr_no: item.id,
        item: `Issue ${item.id}`,
        description: item.description,
        who: item.who,
        done: item.done,
        date: item.date,
        _id: item._id
      }))
      setYesterdayIssues(mappedYesterdayData)
    } catch (err) {
      console.error('Failed to load yesterday issues:', err)
    }
  }

  const handleAddSafetyIssue = async () => {
    if (newSafetyIssue.issue && newSafetyIssue.person && newSafetyIssue.action) {
      try {
        await safetyAPI.create({
          issue: newSafetyIssue.issue,
          person: newSafetyIssue.person,
          action: newSafetyIssue.action
        })
        
        setNewSafetyIssue({ issue: "", person: "", action: "" })
        setIsAddingIssue(false)
        await loadSafetyIssues() // Reload only safety issues
      } catch (err) {
        setError('Failed to add safety issue: ' + err.message)
      }
    }
  }

  const handleAddKudos = async () => {
    if (newKudos.name && newKudos.action && newKudos.by_whom) {
      try {
        await kudosAPI.create({
          name: newKudos.name,
          action: newKudos.action,
          by_whom: newKudos.by_whom
        })
        
        setNewKudos({ name: "", action: "", by_whom: "" })
        setIsAddingKudos(false)
        await loadKudos() // Reload only kudos
      } catch (err) {
        setError('Failed to add kudos: ' + err.message)
      }
    }
  }

  const handleAddTodayIssue = async () => {
    if (newTodayIssue.description && newTodayIssue.who) {
      try {
        await todayAPI.create({
          description: newTodayIssue.description,
          who: newTodayIssue.who
        })
        
        setNewTodayIssue({ description: "", who: "" })
        setIsAddingTodayIssue(false)
        
        // Reload both today and yesterday issues since backend adds to both
        await Promise.all([
          loadTodayIssues(),
          loadYesterdayIssues()
        ])
        
        // Show a brief success message
        setError(null)
      } catch (err) {
        setError('Failed to add issue: ' + err.message)
      }
    }
  }

  const handleDeleteTodayIssue = async (id) => {
    try {
      await todayAPI.delete(id)
      await loadTodayIssues() // Reload only today issues
    } catch (err) {
      setError('Failed to delete issue: ' + err.message)
    }
  }

  const handleResetTodayIssues = async () => {
    if (window.confirm('Are you sure you want to reset Today\'s Issues? This will clear all standup items for a fresh start.')) {
      try {
        const result = await resetAPI.resetTodayIssues()
        await loadTodayIssues() // Reload today issues
        setError(null)
        // Show success message briefly
        alert(`✅ ${result.message || 'Today\'s Issues reset successfully!'}`)
      } catch (err) {
        setError('Failed to reset today\'s issues: ' + err.message)
      }
    }
  }

  const handleDeleteYesterdayIssue = async (id) => {
    try {
      await yesterdayAPI.delete(id)
      await loadYesterdayIssues() // Reload only yesterday issues table
    } catch (err) {
      setError('Failed to delete issue: ' + err.message)
    }
  }

  const handleToggleYesterdayStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Yes' ? 'No' : 'Yes'
      
      await yesterdayAPI.update(id, { done: newStatus })
      await loadYesterdayIssues() // Reload only yesterday issues table
    } catch (err) {
      setError('Failed to update status: ' + err.message)
    }
  }

  const handleToggleSafetyStatus = async (id, currentStatus) => {
    try {
      console.log('🔄 Toggling safety status:', { id, currentStatus });
      const newStatus = currentStatus === 'Yes' ? 'No' : 'Yes'
      console.log('📝 New status will be:', newStatus);
      
      const response = await safetyAPI.update(id, { done: newStatus })
      console.log('✅ Update response:', response);
      
      await loadSafetyIssues() // Reload only safety issues table
    } catch (err) {
      console.error('❌ Toggle error:', err);
      setError('Failed to update safety issue status: ' + err.message)
    }
  }

  const handleDeleteSafetyIssue = async (id) => {
    try {
      await safetyAPI.delete(id)
      await loadSafetyIssues() // Reload only safety issues table
    } catch (err) {
      setError('Failed to delete safety issue: ' + err.message)
    }
  }

  const handleDeleteKudos = async (id) => {
    try {
      await kudosAPI.delete(id)
      await loadKudos() // Reload only kudos table
    } catch (err) {
      setError('Failed to delete kudos: ' + err.message)
    }
  }

  // Handle task change (process selection)
  const handleTaskChange = async (batchNumber, process) => {
    try {
      // Check if batch exists in MongoDB
      const existingBatch = batchData.find(b => (b.batch_number || b.batch_id) === batchNumber)
      
      if (!existingBatch?.current_process) {
        // Create new batch entry
        await fetch(`${API_BASE_URL}/batch-processes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_name: batchNumber,
            current_process: process,
            status: 'To be started'
          })
        })
      } else {
        // Update existing
        await fetch(`${API_BASE_URL}/batch-processes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch_name: batchNumber,
            current_process: process
          })
        })
      }
      
      // Only reload batch data, not entire page
      const [batches, batchProcesses] = await Promise.all([
        batchAPI.getCurrentLocation(),
        fetch(`${API_BASE_URL}/batch-processes`).then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ])
      
      // Merge batch task data
      const taskMap = {}
      if (batchProcesses.success && batchProcesses.data) {
        batchProcesses.data.forEach(task => {
          taskMap[task.batch_name] = {
            current_process: task.current_process,
            task_status: task.status,
            last_updated: task.last_updated
          }
        })
      }
      
      const mergedBatches = batches.map(batch => ({
        ...batch,
        ...taskMap[batch.batch_number || batch.batch_id]
      }))
      
      setBatchData(mergedBatches)
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  // Handle status change
  const handleStatusChange = async (batchNumber, status) => {
    try {
      await fetch(`${API_BASE_URL}/batch-processes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_name: batchNumber,
          status: status
        })
      })
      
      // Only reload batch data, not entire page
      const [batches, batchProcesses] = await Promise.all([
        batchAPI.getCurrentLocation(),
        fetch(`${API_BASE_URL}/batch-processes`).then(r => r.json()).catch(() => ({ success: false, data: [] }))
      ])
      
      // Merge batch task data
      const taskMap = {}
      if (batchProcesses.success && batchProcesses.data) {
        batchProcesses.data.forEach(task => {
          taskMap[task.batch_name] = {
            current_process: task.current_process,
            task_status: task.status,
            last_updated: task.last_updated
          }
        })
      }
      
      const mergedBatches = batches.map(batch => ({
        ...batch,
        ...taskMap[batch.batch_number || batch.batch_id]
      }))
      
      setBatchData(mergedBatches)
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  // Ref to store debounce timeout IDs for batch priorities
  const batchPriorityTimeouts = useRef({});

  // Handle batch priority change with debouncing
  const handlePriorityChange = (batchId, priority) => {
    // Update locally immediately for visual feedback (store original value)
    setBatchPriorities(prev => ({
      ...prev,
      [batchId]: priority === '' ? undefined : priority
    }))

    // Clear existing timeout for this field
    if (batchPriorityTimeouts.current[batchId]) {
      clearTimeout(batchPriorityTimeouts.current[batchId]);
    }

    // Set new timeout to save after 1 second of no typing
    batchPriorityTimeouts.current[batchId] = setTimeout(async () => {
      try {
        // Save to backend
        await batchAPI.updatePriority(batchId, priority)
      } catch (err) {
        console.error('Failed to update priority:', err)
        // Reload priorities on error to sync with backend
        const priorities = await batchAPI.getPriorities()
        setBatchPriorities(priorities?.data || {})
      }
    }, 1000); // Wait 1 second after last keystroke
  }

  // Normalize priority input to get numeric value for sorting/coloring
  const normalizePriority = (input) => {
    if (!input || input === '') return '';
    const normalized = input.toString().toLowerCase().trim();
    
    // High priority
    if (normalized === 'h' || normalized === 'high' || normalized === '1') {
      return '1';
    }
    // Medium priority
    if (normalized === 'm' || normalized === 'medium' || normalized === '2') {
      return '2';
    }
    // Low priority
    if (normalized === 'l' || normalized === 'low' || normalized === '3') {
      return '3';
    }
    
    return input; // Return original if not recognized
  };

  // Get row color based on priority
  const getPriorityRowColor = (priority, index) => {
    if (!priority) return index % 2 === 0 ? "bg-muted/50" : "";
    
    const normalized = normalizePriority(priority);
    switch (parseInt(normalized)) {
      case 1:
        return 'bg-red-500/50';
      case 2:
        return 'bg-blue-500/50';
      case 3:
        return 'bg-green-500/50';
      default:
        return index % 2 === 0 ? "bg-muted/50" : "";
    }
  };

  const getFilteredYesterdayIssues = () => {
    // Show incomplete issues first, then completed ones (max 10 total)
    const incomplete = yesterdayIssues.filter((issue) => issue.done === "No")
    const completed = yesterdayIssues.filter((issue) => issue.done === "Yes")
    
    if (showOnlyIncomplete) {
      return incomplete.slice(-10) // Show last 10 incomplete only
    }
    
    // Show incomplete first, then completed (total max 10)
    const incompleteToShow = incomplete.slice(-10)
    const completedToShow = completed.slice(-(10 - incompleteToShow.length))
    
    return [...incompleteToShow, ...completedToShow]
  }

  const getFilteredTodayIssues = () => {
    // Show last 10 today's issues for consistent scrolling experience
    return todayIssues.slice(-10)
  }

  const getFilteredKudosData = () => {
    // Show last 10 kudos entries for consistent scrolling experience
    return kudosData.slice(-10)
  }

  const getFilteredSafetyIssues = () => {
    // Show incomplete safety issues first, then completed ones (max 10 total)
    const incomplete = safetyIssues.filter((issue) => (issue.done || "No") === "No")
    const completed = safetyIssues.filter((issue) => (issue.done || "No") === "Yes")
    
    if (showOnlyIncompleteSafety) {
      return incomplete.slice(-10) // Show last 10 incomplete only
    }
    
    // Show incomplete first, then completed (total max 10)
    const incompleteToShow = incomplete.slice(-10)
    const completedToShow = completed.slice(-(10 - incompleteToShow.length))
    
    return [...incompleteToShow, ...completedToShow]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const mainApp = (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-background dark">
      
      {/* Header Section */}
      <div className="sticky top-0 z-50">
        <div className="bg-black shadow-md transition-all duration-300">
          <div className="flex h-25 items-center px-6">
          <div className="flex items-center space-x-4 ml-40">
            {/* Logo */}
            <img 
              src="/logo.png" 
              alt="Rayleigh Solar Tech" 
              className="h-15 w-auto object-contain"
            />
            {/* API Status Indicator - Only show when disconnected */}
            {apiStatus === 'disconnected' && (
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm text-red-500">API Disconnected</span>
              </div>
            )}
          </div>
          
          {/* Center section - Refresh and Explore buttons */}
          <div className="ml-auto mr-4 flex items-center space-x-2">
            <Button 
              variant="ghost" 
              onClick={handleRefreshAll} 
              className="text-muted-foreground hover:text-foreground border-2 border-border"
              title="Refresh all data and clear all MongoDB caches (All Data, Charts, Device Yield, IV Repeatability)"
            >
              🔄 Refresh All Data
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground border-2 border-border">
                  <Menu className="h-4 w-4 mr-2" />
                  Explore
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700 shadow-2xl z-50">
                <DropdownMenuItem asChild>
                  <Link to="/morning-meetings" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    Morning Meetings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/stability" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    Stability
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/upload-data" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    Upload Data
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/analysis" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    Analysis
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/all-data" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    All Data
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/track-progress" className="cursor-pointer text-white hover:bg-gray-800 focus:bg-gray-800">
                    Track Progress
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right section - User Profile Circle with Dropdown */}
          <div className="flex items-center space-x-2 mr-40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer border-2 border-border">
                  {(() => {
                    const email = localStorage.getItem('userEmail') || 'user@rayleighsolartech.com';
                    const namePart = email.split('@')[0]; // Get part before @
                    const names = namePart.split('.'); // Split by dot
                    const firstInitial = names[0]?.charAt(0).toUpperCase() || 'U';
                    const lastInitial = names[1]?.charAt(0).toUpperCase() || '';
                    return `${firstInitial}${lastInitial}`;
                  })()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-gray-900 border-gray-700 shadow-2xl z-50">
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-white mt-1">
                    {localStorage.getItem('userEmail') || 'user@rayleighsolartech.com'}
                  </p>
                </div>
                <DropdownMenuItem asChild>
                  <button
                    onClick={() => azureLogout()}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                  >
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {error && (
          <div className="bg-destructive/10 border-destructive/20 border-b px-6 py-2">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
        </div>
        {/* Gradient overlay when scrolled */}
        <div 
          className={`h-8 bg-gradient-to-b from-black/70 via-black/40 to-transparent transition-opacity duration-300 ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      <div className="p-6 space-y-6">
        {/* Batch Location Information Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Batch Location Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="max-h-[500px] overflow-y-auto relative">
                <table className="w-full [&_td]:align-top">
                  <thead className="sticky top-0 z-20 shadow-sm" style={{ backgroundColor: 'hsl(var(--card))' }}>
                    <tr className="border-b border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground border-b-2 border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>Batch Number</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground border-b-2 border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>Batch Name</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground border-b-2 border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>Task</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground border-b-2 border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground border-b-2 border-border" style={{ backgroundColor: 'hsl(var(--card))' }}>Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.length > 0 ? (() => {
                      // Sort batches by priority
                      const sortedBatches = [...batchData].sort((a, b) => {
                        const priorityA = batchPriorities[a.batch_id];
                        const priorityB = batchPriorities[b.batch_id];
                        
                        // If both have no priority, maintain original order
                        if (!priorityA && !priorityB) return 0;
                        // If only A has no priority, B comes first
                        if (!priorityA) return 1;
                        // If only B has no priority, A comes first
                        if (!priorityB) return -1;
                        // Both have priority, normalize and sort by priority value (1 < 2 < 3)
                        const normalizedA = parseInt(normalizePriority(priorityA));
                        const normalizedB = parseInt(normalizePriority(priorityB));
                        return normalizedA - normalizedB;
                      });
                      
                      return sortedBatches.map((batch, index) => {
                      const priority = batchPriorities[batch.batch_id];
                      
                      return (
                        <tr key={batch.batch_id || index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">
                            <div className="px-4 py-2 bg-orange-500 text-white rounded-lg inline-block font-medium">
                              {batch.batch_number || batch.batch_id || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-4">{batch.batch_name || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <select
                              value={batch.current_process || ''}
                              onChange={(e) => handleTaskChange(batch.batch_number || batch.batch_id, e.target.value)}
                              className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md cursor-pointer"
                            >
                              <option value="" className="bg-gray-800 text-white">Select task</option>
                              <option value="Solution prep" className="bg-gray-800 text-white">Solution prep</option>
                              <option value="P1/cleaning" className="bg-gray-800 text-white">P1/cleaning</option>
                              <option value="Coating" className="bg-gray-800 text-white">Coating</option>
                              <option value="QC/characterization" className="bg-gray-800 text-white">QC/characterization</option>
                              <option value="P2 scribing" className="bg-gray-800 text-white">P2 scribing</option>
                              <option value="Carbon" className="bg-gray-800 text-white">Carbon</option>
                              <option value="Encapsulation" className="bg-gray-800 text-white">Encapsulation</option>
                              <option value="Dicing" className="bg-gray-800 text-white">Dicing</option>
                              <option value="Testing" className="bg-gray-800 text-white">Testing</option>
                              <option value="Stability" className="bg-gray-800 text-white">Stability</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={batch.task_status || ''}
                              onChange={(e) => handleStatusChange(batch.batch_number || batch.batch_id, e.target.value)}
                              className={`w-full p-2 rounded-lg font-semibold cursor-pointer ${
                                batch.task_status === 'Done' ? 'bg-green-500 text-white' :
                                batch.task_status === 'Work in progress' ? 'bg-yellow-400 text-black' :
                                batch.task_status === 'To be started' ? 'bg-red-400 text-white' :
                                'bg-gray-600 text-white'
                              }`}
                            >
                              <option value="" className="bg-gray-800 text-white">Select status</option>
                              <option value="Done" className="bg-gray-800 text-white">Done</option>
                              <option value="Work in progress" className="bg-gray-800 text-white">Work in progress</option>
                              <option value="To be started" className="bg-gray-800 text-white">To be started</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="px-4 py-2 bg-slate-500 text-white rounded-lg inline-block">
                              {batch.last_updated || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      );
                    })})() : (
                      <tr>
                        <td colSpan="5" className="py-8 px-4 text-center text-muted-foreground">
                          {loading ? 'Loading batch data...' : 'No batch data available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Baseline Batches Section */}
        <BaselineBatches />

        {/* Charts - Separate Analysis Sections */}
        <div className="space-y-8">
          {/* 1. Parameter Analysis (FF, PCE, etc.) */}
          <div className="w-full">
            <ParameterChart key={`param-${refreshKey}`} />
          </div>

          {/* 2. PCE Std Dev Analysis */}
          <PCEStdDevChart key={`stddev-${refreshKey}`} />

          {/* 3. Device Yield Analysis */}
          <DeviceYieldChart key={`yield-${refreshKey}`} />

          {/* 4. IV Repeatability Analysis */}
          <IVRepeatabilityChart key={`iv-${refreshKey}`} />
        </div>
      </div>
    </div>
        } />
        <Route path="/upload-data" element={<UploadData />} />
        <Route path="/stability" element={<StabilityDashboard />} />
        <Route path="/stability-history" element={<StabilityHistory />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/all-data" element={<AllData />} />
        <Route path="/morning-meetings" element={<MorningMeetings />} />
        <Route path="/track-progress" element={<TrackProgress />} />
        <Route path="/batch-tasks" element={<BatchTaskTracker />} />
      </Routes>
    </Router>
  )

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // If not authenticated (should not happen in dev, only in production without Azure AD)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            Please sign in with your Rayleigh Solar Tech Microsoft account to access the dashboard.
          </p>
          <Button 
            onClick={() => window.location.href = '/.auth/login/aad'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sign in with Microsoft
          </Button>
        </div>
      </div>
    )
  }

  // Show main app if authenticated
  return mainApp
}