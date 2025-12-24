import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { safetyAPI, todayAPI, kudosAPI, topIssuesAPI } from "@/lib/api";
import Navigation from "./Navigation";
import { TEAM_MEMBERS } from "@/lib/constants";
import NameInputAutocomplete from "@/components/ui/name-input-autocomplete";
import TeamRocketCelebration from "./TeamRocketCelebration";

const fuzzyMatch = (input, target) => {
  const inputLower = input.toLowerCase().replace(/[^a-z]/g, '');
  const targetLower = target.toLowerCase().replace(/[^a-z]/g, '');
  
  // Exact match
  if (inputLower === targetLower) return 100;
  
  // Contains match
  if (targetLower.includes(inputLower)) return 80;
  
  // Calculate similarity score based on common characters
  let matches = 0;
  for (let char of inputLower) {
    if (targetLower.includes(char)) matches++;
  }
  
  return (matches / Math.max(inputLower.length, targetLower.length)) * 70;
};

// Get best matching name
const getMatchingName = (input) => {
  if (!input || input.trim().length < 2) return [];
  
  const matches = TEAM_MEMBERS.map(name => ({
    name,
    score: fuzzyMatch(input, name)
  }))
  .filter(m => m.score > 50) // Threshold for matching
  .sort((a, b) => b.score - a.score);
  
  return matches;
};

const MorningMeetings = () => {
  const [safetyIssues, setSafetyIssues] = useState([]);
  const [topIssues, setTopIssues] = useState([]);
  const [kudosData, setKudosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add new entry states
  const [isAddingIssue, setIsAddingIssue] = useState(false);
  const [isAddingKudos, setIsAddingKudos] = useState(false);
  const [isAddingTopIssue, setIsAddingTopIssue] = useState(false);
  const [newSafetyIssue, setNewSafetyIssue] = useState({ issue: "", person: "", action: "" });
  const [newKudos, setNewKudos] = useState({ name: "", action: "", by_whom: "" });
  const [newTopIssue, setNewTopIssue] = useState({ description: "", who: "", priority: "" });
  
  // Filter states
  const [showOnlyIncompleteSafety, setShowOnlyIncompleteSafety] = useState(true);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(true);
  
  // Kudos graph state
  const [kudosGraphType, setKudosGraphType] = useState("given"); // Only "given" graph
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format (current month)
  
  // Edit states
  const [editingSafety, setEditingSafety] = useState(null);
  const [editingTopIssue, setEditingTopIssue] = useState(null);
  const [editingKudos, setEditingKudos] = useState(null);
  const [editedData, setEditedData] = useState({});
  
  // Pagination states
  const [safetyPagination, setSafetyPagination] = useState({ total: 0, loaded: 0, limit: 20 });
  const [kudosPagination, setKudosPagination] = useState({ total: 0, loaded: 0, limit: 20 });
  const [topIssuesPagination, setTopIssuesPagination] = useState({ total: 0, loaded: 0, limit: 20 });
  
  // Team Rocket celebration state
  const [showTeamRocketCelebration, setShowTeamRocketCelebration] = useState(false);

  // Autocomplete states
  const [nameSuggestions, setNameSuggestions] = useState({
    safety_person: [],
    kudos_name: [],
    kudos_by_whom: [],
    top_who: []
  });
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);

  // Refs for scroll detection
  const safetyScrollRef = useRef(null);
  const kudosScrollRef = useRef(null);
  const topIssuesScrollRef = useRef(null);

  // Loading states to prevent duplicate requests
  const [isLoadingSafety, setIsLoadingSafety] = useState(false);
  const [isLoadingKudos, setIsLoadingKudos] = useState(false);
  const [isSubmittingKudos, setIsSubmittingKudos] = useState(false);
  const [isSubmittingTopIssue, setIsSubmittingTopIssue] = useState(false);
  const [isLoadingTopIssues, setIsLoadingTopIssues] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSafetyIssues(),
        loadTopIssues(),
        loadKudos()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSafetyIssues = async (append = false) => {
    if (isLoadingSafety) return;
    try {
      setIsLoadingSafety(true);
      const skip = append ? safetyPagination.loaded : 0;
      const result = await safetyAPI.getAll(safetyPagination.limit, skip);
      const data = result.data || result;
      
      // Deduplicate by _id when appending
      if (append) {
        const existingIds = new Set(safetyIssues.map(issue => issue._id));
        const newData = data.filter(issue => !existingIds.has(issue._id));
        setSafetyIssues([...safetyIssues, ...newData]);
      } else {
        // Remove duplicates in the initial load
        const uniqueData = Array.from(new Map(data.map(item => [item._id, item])).values());
        setSafetyIssues(uniqueData);
      }
      
      setSafetyPagination({
        total: result.total || data.length,
        loaded: append ? safetyPagination.loaded + data.length : data.length,
        limit: safetyPagination.limit
      });
    } catch (err) {
      console.error('Failed to load safety issues:', err);
    } finally {
      setIsLoadingSafety(false);
    }
  };

  const loadTopIssues = async (append = false) => {
    if (isLoadingTopIssues) return;
    try {
      setIsLoadingTopIssues(true);
      const skip = append ? topIssuesPagination.loaded : 0;
      const result = await todayAPI.getAll(topIssuesPagination.limit, skip); // Uses unified backend
      const data = result.data || result;
      
      // Map done field to status for unified display and preserve priority
      const mappedData = data.map(issue => ({
        ...issue,
        status: issue.done === 'Yes' ? 'Done' : issue.status || 'Pending',
        priority: issue.priority || ''
      }));
      
      // Deduplicate by sr_no when appending
      if (append) {
        const existingIds = new Set(topIssues.map(issue => issue.sr_no));
        const newData = mappedData.filter(issue => !existingIds.has(issue.sr_no));
        setTopIssues([...topIssues, ...newData]);
      } else {
        // Remove duplicates in the initial load
        const uniqueData = Array.from(new Map(mappedData.map(item => [item.sr_no, item])).values());
        setTopIssues(uniqueData);
      }
      
      setTopIssuesPagination({
        total: result.total || data.length,
        loaded: append ? topIssuesPagination.loaded + data.length : data.length,
        limit: topIssuesPagination.limit
      });
    } catch (err) {
      console.error('Failed to load top issues:', err);
    } finally {
      setIsLoadingTopIssues(false);
    }
  };

  const loadKudos = async (append = false) => {
    if (isLoadingKudos) return;
    try {
      setIsLoadingKudos(true);
      const skip = append ? kudosPagination.loaded : 0;
      const limit = kudosPagination.limit;
      const result = await kudosAPI.getAll(limit, skip);
      const data = result.data || result;
      
      // Deduplicate by _id when appending
      if (append) {
        const existingIds = new Set(kudosData.map(kudos => kudos._id));
        const newData = data.filter(kudos => !existingIds.has(kudos._id));
        setKudosData([...kudosData, ...newData]);
      } else {
        // Remove duplicates in the initial load
        const uniqueData = Array.from(new Map(data.map(item => [item._id, item])).values());
        setKudosData(uniqueData);
      }
      
      setKudosPagination({
        total: result.total || data.length,
        loaded: append ? kudosPagination.loaded + data.length : data.length,
        limit: kudosPagination.limit
      });
    } catch (err) {
      console.error('Failed to load kudos:', err);
    } finally {
      setIsLoadingKudos(false);
    }
  };

  // Scroll handler for infinite scroll
  const handleScroll = (e, loadFunction, pagination) => {
    const element = e.target;
    const scrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50; // 50px threshold
    
    if (scrolledToBottom && pagination.loaded < pagination.total) {
      loadFunction(true); // Load more items
    }
  };



  const handleAddSafetyIssue = async () => {
    if (!newSafetyIssue.issue || !newSafetyIssue.person || !newSafetyIssue.action) {
      setError('All fields are required for safety issues');
      return;
    }
    
    try {
      // Auto-correct names to match team members list (case-insensitive)
      const correctName = (inputName) => {
        const trimmed = inputName.trim();
        const matched = TEAM_MEMBERS.find(member => 
          member.toLowerCase() === trimmed.toLowerCase()
        );
        return matched || trimmed; // Return matched name or original if no match
      };

      // Split persons by comma and create separate safety issues for each person
      const persons = newSafetyIssue.person.split(',').map(person => person.trim()).filter(person => person.length > 0);
      
      if (persons.length === 0) {
        setError('Please enter at least one person');
        return;
      }

      // Create a safety issue entry for each person
      for (const person of persons) {
        const correctedSafetyIssue = {
          issue: newSafetyIssue.issue.trim(),
          person: correctName(person),
          action: newSafetyIssue.action.trim(),
          done: "No"
        };

        await safetyAPI.create(correctedSafetyIssue);
      }

      setNewSafetyIssue({ issue: "", person: "", action: "" });
      setIsAddingIssue(false);
      await loadSafetyIssues();
    } catch (err) {
      setError('Failed to add safety issue: ' + err.message);
    }
  };

  const handleAddKudos = async () => {
    // Prevent duplicate submissions
    if (isSubmittingKudos) return;

    // Validate all fields are filled
    if (!newKudos.name?.trim() || !newKudos.action?.trim() || !newKudos.by_whom?.trim()) {
      setError('All fields (Name, Action, and By Whom) are required for kudos');
      return;
    }

    try {
      setIsSubmittingKudos(true);

      // Auto-correct names to match team members list (case-insensitive)
      const correctName = (inputName) => {
        const trimmed = inputName.trim();
        const matched = TEAM_MEMBERS.find(member => 
          member.toLowerCase() === trimmed.toLowerCase()
        );
        return matched || trimmed; // Return matched name or original if no match
      };

      // Split names by comma and create separate kudos entries for each person
      const names = newKudos.name.split(',').map(name => name.trim()).filter(name => name.length > 0);
      
      if (names.length === 0) {
        setError('Please enter at least one name');
        return;
      }

      // Create a kudos entry for each person
      let teamRocketDetected = false;
      
      for (const name of names) {
        const correctedKudos = {
          name: correctName(name),
          action: newKudos.action.trim(),
          by_whom: correctName(newKudos.by_whom)
        };

        // Check if Team Rocket received kudos
        if (correctedKudos.name.toLowerCase() === 'team rocket') {
          teamRocketDetected = true;
        }

        await kudosAPI.create(correctedKudos);
      }

      setNewKudos({ name: "", action: "", by_whom: "" });
      setIsAddingKudos(false);
      await loadKudos();
      
      // Trigger Team Rocket celebration if detected!
      if (teamRocketDetected) {
        setShowTeamRocketCelebration(true);
      }
    } catch (err) {
      setError('Failed to add kudos: ' + err.message);
    } finally {
      setIsSubmittingKudos(false);
    }
  };

  // NEW UNIFIED TOP ISSUES HANDLERS
  const handleAddTopIssue = async () => {
    if (!newTopIssue.description || !newTopIssue.who) {
      setError('Description and Who fields are required');
      return;
    }
    
    // Prevent duplicate submissions (like kudos)
    if (isSubmittingTopIssue) {
      console.log('⏸️ Already submitting, ignoring duplicate request');
      return;
    }
    
    setIsSubmittingTopIssue(true);
    
    try {
      // Create temporary ID for optimistic update
      const tempId = Date.now();
      const issueData = {
        description: newTopIssue.description,
        who: newTopIssue.who,
        priority: newTopIssue.priority || '',
        status: "Pending"
      };
      
      const tempIssue = {
        sr_no: tempId,
        id: tempId,
        ...issueData,
        date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
      };
      
      // Add to UI immediately for instant feedback
      setTopIssues(prevIssues => [tempIssue, ...prevIssues]);
      setNewTopIssue({ description: "", who: "", priority: "" });
      setIsAddingTopIssue(false);
      
      // Save to backend in background and replace temp issue with real one
      const result = await topIssuesAPI.create(issueData);
      const newIssue = result.data;
      
      // Replace temp issue with real issue from backend
      setTopIssues(prevIssues => 
        prevIssues.map(issue => 
          issue.sr_no === tempId ? { ...newIssue, sr_no: newIssue.id || newIssue.sr_no } : issue
        )
      );
      
      // Remove any duplicates that might have snuck in
      setTopIssues(prevIssues => {
        const uniqueMap = new Map();
        prevIssues.forEach(issue => {
          const key = issue.sr_no || issue.id;
          if (!uniqueMap.has(key) || issue.sr_no !== tempId) {
            uniqueMap.set(key, issue);
          }
        });
        return Array.from(uniqueMap.values());
      });
    } catch (err) {
      setError('Failed to add issue: ' + err.message);
      await loadTopIssues();
    } finally {
      setIsSubmittingTopIssue(false);
    }
  };

  const handleToggleStatus = async (sr_no, currentStatus) => {
    try {
      const newStatus = currentStatus === "Done" ? "Pending" : "Done";
      
      // Update UI immediately for instant feedback
      setTopIssues(prevIssues => 
        prevIssues.map(issue => 
          issue.sr_no === sr_no ? { ...issue, status: newStatus } : issue
        )
      );
      
      // Save to backend in background
      await topIssuesAPI.update(sr_no, { status: newStatus });
    } catch (err) {
      setError('Failed to update status: ' + err.message);
      await loadTopIssues();
    }
  };

  const handleUpdateTopIssue = async (sr_no) => {
    try {
      // Update UI immediately for instant feedback
      setTopIssues(prevIssues =>
        prevIssues.map(issue =>
          issue.sr_no === sr_no ? { ...issue, ...editedData } : issue
        )
      );
      setEditingTopIssue(null);
      setEditedData({});
      
      // Save to backend in background
      await topIssuesAPI.update(sr_no, editedData);
    } catch (err) {
      setError('Failed to update issue');
      await loadTopIssues();
    }
  };

  const handleDeleteTopIssue = async (sr_no) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      // Remove from UI immediately for instant feedback
      setTopIssues(prevIssues => prevIssues.filter(issue => issue.sr_no !== sr_no));
      
      // Delete from backend in background
      await topIssuesAPI.delete(sr_no);
    } catch (err) {
      setError('Failed to delete issue: ' + err.message);
      await loadTopIssues();
    }
  };

  const handlePriorityChange = async (sr_no, priority) => {
    // Optimistic update - update UI immediately for instant feedback
    setTopIssues(prevIssues =>
      prevIssues.map(issue =>
        issue.sr_no === sr_no ? { ...issue, priority } : issue
      )
    );

    // Then save to backend in background
    try {
      console.log('🔄 Saving priority to backend:', { sr_no, priority });
      const result = await topIssuesAPI.update(sr_no, { priority });
      console.log('✅ Priority saved to backend:', result);
    } catch (err) {
      console.error('❌ Failed to update priority:', err);
      setError('Failed to update priority: ' + err.message);
      // Revert on error - reload from backend
      await loadTopIssues();
    }
  };



  // Name autocomplete handlers
  const handleNameInput = (fieldName, value) => {
    if (!value || value.trim().length < 2) {
      setNameSuggestions(prev => ({ ...prev, [fieldName]: [] }));
      if (activeSuggestionField === fieldName) {
        setActiveSuggestionField(null);
      }
      return;
    }
    
    const matches = getMatchingName(value);
    if (matches && matches.length > 0) {
      setNameSuggestions(prev => ({ ...prev, [fieldName]: matches }));
      setActiveSuggestionField(fieldName);
    } else {
      setNameSuggestions(prev => ({ ...prev, [fieldName]: [] }));
      if (activeSuggestionField === fieldName) {
        setActiveSuggestionField(null);
      }
    }
  };

  const selectSuggestion = (fieldName, name, stateSetter, stateObj, field) => {
    stateSetter({ ...stateObj, [field]: name });
    setNameSuggestions(prev => ({ ...prev, [fieldName]: [] }));
    setActiveSuggestionField(null);
  };

  const handleToggleSafetyStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "Yes" ? "No" : "Yes";
      
      // Update local state immediately for smooth UX
      setSafetyIssues(prevIssues => 
        prevIssues.map(issue => 
          issue._id === id ? { ...issue, done: newStatus } : issue
        )
      );
      
      // Update in database in background
      await safetyAPI.update(id, { done: newStatus });
    } catch (err) {
      setError('Failed to update safety issue status: ' + err.message);
      // Reload on error to restore correct state
      await loadSafetyIssues();
    }
  };



  const handleDeleteSafetyIssue = async (id) => {
    try {
      console.log(`🗑️ Deleting safety issue: ${id}`);
      
      // Delete from database FIRST
      const result = await safetyAPI.delete(id);
      console.log('✅ Delete result:', result);
      
      // Only update local state after successful delete
      setSafetyIssues(prevIssues => 
        prevIssues.filter(issue => issue._id !== id)
      );
      
      console.log('✅ Safety issue deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete safety issue:', err);
      setError('Failed to delete safety issue: ' + err.message);
      // Reload on error to restore correct state
      await loadSafetyIssues();
    }
  };



  const handleDeleteKudos = async (id) => {
    try {
      console.log(`🗑️ Deleting kudos: ${id}`);
      const result = await kudosAPI.delete(id);
      console.log('✅ Delete result:', result);
      await loadKudos();
      console.log('✅ Kudos deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete kudos:', err);
      setError('Failed to delete kudos: ' + err.message);
    }
  };

  // Update handlers
  const handleUpdateSafetyIssue = async (id) => {
    try {
      await safetyAPI.update(id, editedData);
      await loadSafetyIssues();
      setEditingSafety(null);
      setEditedData({});
    } catch (err) {
      setError('Failed to update safety issue: ' + err.message);
    }
  };



  const handleUpdateKudos = async (id) => {
    try {
      await kudosAPI.update(id, editedData);
      await loadKudos();
      setEditingKudos(null);
      setEditedData({});
    } catch (err) {
      setError('Failed to update kudos: ' + err.message);
    }
  };

  const startEditingSafety = (row) => {
    setEditingSafety(row._id);
    setEditedData({ issue: row.issue, person: row.person, action: row.action });
  };



  const startEditingKudos = (row) => {
    setEditingKudos(row._id);
    setEditedData({ name: row.name, action: row.action, by_whom: row.by_whom });
  };

  const cancelEdit = () => {
    setEditingSafety(null);
    setEditingTopIssue(null);
    setEditingKudos(null);
    setEditedData({});
  };

  // Normalize priority input to get numeric value for sorting/coloring
  const normalizePriority = (input) => {
    if (!input || input === '') return '';
    const normalized = input.toString().toLowerCase().trim();
    
    // High priority
    if (normalized === 'h' || normalized === 'high' || normalized === '1' || normalized === 'H' || normalized === 'HIGH') {
      return '1';
    }
    // Medium priority
    if (normalized === 'm' || normalized === 'medium' || normalized === '2' || normalized === 'M' || normalized === 'MEDIUM') {
      return '2';
    }
    // Low priority
    if (normalized === 'l' || normalized === 'low' || normalized === '3' || normalized === 'L' || normalized === 'LOW') {
      return '3';
    }
    
    return input; // Return original if not recognized
  };



  const sortIssuesByPriority = (issues) => {
    return [...issues].sort((a, b) => {
      const priorityA = a.priority;
      const priorityB = b.priority;
      
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
  };

  const getFilteredSafetyIssues = useMemo(() => {
    // Sort by sr_no descending (newest first) or by _id if sr_no doesn't exist
    const sorted = [...safetyIssues].sort((a, b) => {
      if (a.sr_no && b.sr_no) return b.sr_no - a.sr_no;
      // Fallback: compare _id as strings (MongoDB ObjectIds are sortable)
      return String(b._id).localeCompare(String(a._id));
    });
    
    if (showOnlyIncompleteSafety) {
      return sorted.filter((issue) => {
        const doneStatus = (issue.done || "No").toString().toLowerCase().trim();
        return doneStatus !== "yes" && doneStatus !== "y";
      });
    }
    
    // Show all loaded items in the sorted order (don't separate by done status)
    return sorted;
  }, [safetyIssues, showOnlyIncompleteSafety]);

  const getFilteredTopIssues = () => {
    let filtered = topIssues;
    
    if (showOnlyIncomplete) {
      filtered = filtered.filter((issue) => {
        const status = issue.status || (issue.done === "Yes" ? "Done" : "Pending");
        return status === "Pending";
      });
    }
    
    // Sort by sr_no descending (newest first)
    const sorted = [...filtered].sort((a, b) => b.sr_no - a.sr_no);
    
    // Take first 10 (newest), then sort by priority
    const recent = sorted.slice(0, 10);
    const prioritySorted = sortIssuesByPriority(recent);
    
    return prioritySorted;
  };

  const getFilteredKudosData = useMemo(() => {
    // Filter by selected month
    const filtered = kudosData.filter(kudos => {
      // If no date info, show in current month only
      if (!kudos.timestamp && !kudos.date) {
        return selectedMonth === new Date().toISOString().slice(0, 7);
      }
      
      try {
        // Use timestamp for accurate date parsing, fallback to date field with current year
        let kudosDate;
        if (kudos.timestamp) {
          kudosDate = new Date(kudos.timestamp);
        } else if (kudos.date) {
          // Date is in MM/DD format - parse it properly
          const [month, day] = kudos.date.split('/');
          const currentYear = new Date().getFullYear();
          kudosDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        }
        
        if (!kudosDate || isNaN(kudosDate.getTime())) {
          // If can't parse, show in current month
          return selectedMonth === new Date().toISOString().slice(0, 7);
        }
        
        const kudosMonth = kudosDate.toISOString().slice(0, 7); // YYYY-MM
        return kudosMonth === selectedMonth;
      } catch (e) {
        // If error, show in current month
        return selectedMonth === new Date().toISOString().slice(0, 7);
      }
    });
    
    // Sort by _id descending (newest first)
    const sorted = [...filtered].sort((a, b) => String(b._id).localeCompare(String(a._id)));
    return sorted;
  }, [kudosData, selectedMonth]);

  // Calculate kudos statistics for graph (filtered by selected month)
  const getKudosStats = useMemo(() => {
    const stats = {};
    
    // Filter kudos by selected month first - use same logic as getFilteredKudosData
    const filteredKudos = kudosData.filter(kudos => {
      if (!kudos.timestamp && !kudos.date) {
        return selectedMonth === new Date().toISOString().slice(0, 7);
      }
      
      try {
        let kudosDate;
        if (kudos.timestamp) {
          kudosDate = new Date(kudos.timestamp);
        } else if (kudos.date) {
          const [month, day] = kudos.date.split('/');
          const currentYear = new Date().getFullYear();
          kudosDate = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        }
        
        if (!kudosDate || isNaN(kudosDate.getTime())) {
          return selectedMonth === new Date().toISOString().slice(0, 7);
        }
        
        const kudosMonth = kudosDate.toISOString().slice(0, 7);
        return kudosMonth === selectedMonth;
      } catch (e) {
        return selectedMonth === new Date().toISOString().slice(0, 7);
      }
    });
    
    filteredKudos.forEach(kudos => {
      if (kudosGraphType === "got") {
        // Count who received kudos
        const name = kudos.name?.trim();
        if (name) {
          stats[name] = (stats[name] || 0) + 1;
        }
      } else {
        // Count who gave kudos
        const giver = kudos.by_whom?.trim();
        if (giver) {
          stats[giver] = (stats[giver] || 0) + 1;
        }
      }
    });
    
    // Convert to array and sort in descending order
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [kudosData, selectedMonth, kudosGraphType]);

  // Name Input Component with Autocomplete (supports comma-separated names)
  const NameInputWithSuggestions = ({ value, onChange, placeholder, fieldName, suggestions }) => {
    const [inputValue, setInputValue] = React.useState(value || '');
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [localSuggestions, setLocalSuggestions] = React.useState([]);
    
    // Sync with parent value when it changes externally (like after form submission)
    React.useEffect(() => {
      setInputValue(value || '');
    }, [value]);
    
    const handleInputChange = (e) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // Get the current word being typed (after the last comma)
      const lastCommaIndex = newValue.lastIndexOf(',');
      const currentWord = newValue.substring(lastCommaIndex + 1).trim();
      
      // Calculate suggestions for the current word being typed
      if (currentWord && currentWord.length >= 2) {
        const matches = getMatchingName(currentWord);
        setLocalSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } else {
        setLocalSuggestions([]);
        setShowSuggestions(false);
      }
    };
    
    const handleSuggestionClick = (name) => {
      // Replace only the current word being typed, not the entire input
      const lastCommaIndex = inputValue.lastIndexOf(',');
      let newInputValue;
      
      if (lastCommaIndex === -1) {
        // No comma found, replace entire input
        newInputValue = name;
      } else {
        // Replace only the text after the last comma
        const beforeLastComma = inputValue.substring(0, lastCommaIndex + 1);
        newInputValue = beforeLastComma + ' ' + name;
      }
      
      setInputValue(newInputValue);
      onChange(newInputValue);
      setShowSuggestions(false);
      setLocalSuggestions([]);
    };
    
    const handleBlur = () => {
      // Update parent with whatever is typed when losing focus
      setTimeout(() => {
        onChange(inputValue);
        setShowSuggestions(false);
      }, 200);
    };
    
    return (
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          autoComplete="off"
        />
        {showSuggestions && localSuggestions.length > 0 && (
          <div className="absolute z-[9999] w-full mt-1 bg-gray-900 border border-gray-600 rounded shadow-lg max-h-48 overflow-auto">
            {localSuggestions.slice(0, 5).map((match, idx) => (
              <div
                key={idx}
                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-white"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(match.name)}
              >
                {match.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Near Misses / Safety Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-balance">Near Misses / Safety Issues</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyIncompleteSafety}
                    onChange={(e) => setShowOnlyIncompleteSafety(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show only incomplete
                </label>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddingIssue(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Issue
            </Button>
          </CardHeader>
          <CardContent>
            <div 
              ref={safetyScrollRef}
              onScroll={(e) => handleScroll(e, loadSafetyIssues, safetyPagination)}
              className="overflow-auto max-h-96 min-h-[20rem] border border-gray-200 rounded"
            >
              <table className="w-full [&_td]:align-top">
                <thead className="bg-gray-800 sticky top-0 z-20">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">SR. NO.</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Issue / Near Miss</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Person</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Action Required</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Done?</th>
                    <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isAddingIssue && (
                    <tr className="bg-accent/50">
                      <td className="py-2 px-3 text-sm text-muted-foreground">Auto</td>
                      <td className="py-2 px-3">
                        <Input
                          placeholder="What was the issue/near miss?"
                          value={newSafetyIssue.issue}
                          onChange={(e) => setNewSafetyIssue({ ...newSafetyIssue, issue: e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <NameInputWithSuggestions
                          placeholder="Who pointed it out? (e.g., Manish, Hisham)"
                          value={newSafetyIssue.person}
                          onChange={(value) => setNewSafetyIssue({ ...newSafetyIssue, person: value })}
                          fieldName="safety_person"
                          suggestions={nameSuggestions.safety_person}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          💡 Tip: Use commas for multiple people
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          placeholder="What action is required?"
                          value={newSafetyIssue.action}
                          onChange={(e) => setNewSafetyIssue({ ...newSafetyIssue, action: e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="destructive" className="cursor-default">No</Badge>
                      </td>
                      <td className="py-2 px-2 text-sm text-muted-foreground">Today</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleAddSafetyIssue} className="h-8 px-3">
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setIsAddingIssue(false);
                              setNewSafetyIssue({ issue: "", person: "", action: "" });
                            }} 
                            className="h-8 px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {getFilteredSafetyIssues.map((row, index) => (
                    <tr key={row._id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="py-2 px-3 text-sm font-medium">#{row.sr_no}</td>
                      <td className="py-2 px-3 text-sm">
                        {editingSafety === row._id ? (
                          <Input
                            value={editedData.issue}
                            onChange={(e) => setEditedData({ ...editedData, issue: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.issue
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {editingSafety === row._id ? (
                          <NameInputAutocomplete
                            value={editedData.person}
                            onChange={(e) => setEditedData({ ...editedData, person: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.person
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {editingSafety === row._id ? (
                          <Input
                            value={editedData.action}
                            onChange={(e) => setEditedData({ ...editedData, action: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.action
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleSafetyStatus(row._id, row.done)}
                          className="p-0 h-auto"
                        >
                          <Badge
                            variant={(row.done || "No") === "Yes" ? "secondary" : "destructive"}
                            className={`cursor-pointer ${(row.done || "No") === "Yes" ? "bg-primary/10 text-primary" : ""}`}
                          >
                            {row.done || "No"}
                          </Badge>
                        </Button>
                      </td>
                      <td className="py-2 px-2 text-sm text-muted-foreground">{row.date}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          {editingSafety === row._id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateSafetyIssue(row._id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                type="button"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                type="button"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingSafety(row)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                type="button"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSafetyIssue(row._id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Loading indicator */}
              {isLoadingSafety && (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading more...</div>
                </div>
              )}
              {/* End of list indicator */}
              {safetyPagination.loaded >= safetyPagination.total && safetyPagination.total > 0 && (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-muted-foreground">All {safetyPagination.total} items loaded</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Top Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Unified Top Issues Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <h3 className="font-medium text-muted-foreground">All Top Issues</h3>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyIncomplete}
                      onChange={(e) => setShowOnlyIncomplete(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Show only Pending
                  </label>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setIsAddingTopIssue(true)} 
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Issue
                </Button>
              </div>
              <div className="overflow-auto max-h-96 border border-gray-200 rounded">
                <table className="w-full [&_td]:align-top">
                  <thead className="bg-gray-800 sticky top-0 z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Issue #</th>
                      <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Description</th>
                      <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Status</th>
                      <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Who</th>
                      <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Priority</th>
                      <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isAddingTopIssue && (
                      <tr className="bg-accent/50">
                        <td className="py-2 px-3 text-sm text-muted-foreground">Auto</td>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Issue description"
                            value={newTopIssue.description}
                            onChange={(e) => setNewTopIssue({ ...newTopIssue, description: e.target.value })}
                            className="h-8"
                          />
                        </td>
                        <td className="py-2 px-3 text-sm text-muted-foreground">Pending</td>
                        <td className="py-2 px-3">
                          <NameInputAutocomplete
                            placeholder="Assigned to"
                            value={newTopIssue.who}
                            onChange={(e) => setNewTopIssue({ ...newTopIssue, who: e.target.value })}
                            className="h-8"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            placeholder="1/h/m/l"
                            value={newTopIssue.priority || ''}
                            onChange={(e) => setNewTopIssue({ ...newTopIssue, priority: e.target.value })}
                            className="w-24 h-8 text-center"
                          />
                        </td>
                        <td className="py-2 px-2 text-sm text-muted-foreground">Today</td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1">
                            <Button size="sm" onClick={handleAddTopIssue} className="h-8 px-3">
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setIsAddingTopIssue(false);
                                setNewTopIssue({ description: "", who: "", priority: "" });
                              }} 
                              className="h-8 px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {getFilteredTopIssues().map((row, index) => {
                      const status = row.status || (row.done === "Yes" ? "Done" : "Pending");
                      const isPending = status === "Pending";
                      
                      // Priority-based row coloring: H=Red, M=Blue, L=Green
                      const priority = (row.priority || '').toLowerCase().trim();
                      let rowBgColor = index % 2 === 0 ? "bg-muted/50" : "";
                      
                      if (priority === 'h' || priority === 'high' || priority === '1') {
                        rowBgColor = "bg-red-300 dark:bg-red-600";
                      } else if (priority === 'm' || priority === 'medium' || priority === '2') {
                        rowBgColor = "bg-blue-300 dark:bg-blue-600";
                      } else if (priority === 'l' || priority === 'low' || priority === '3') {
                        rowBgColor = "bg-green-300 dark:bg-green-600";
                      }
                      
                      return (
                        <tr key={row.sr_no} className={rowBgColor}>
                          <td className="py-2 px-3 text-sm font-medium">#{row.sr_no}</td>
                          <td className="py-2 px-3 text-sm">
                            {editingTopIssue === row.sr_no ? (
                              <Input
                                value={editedData.description}
                                onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              row.description
                            )}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(row.sr_no, status)}
                              className="p-0 h-auto"
                            >
                              <Badge
                                variant={isPending ? "destructive" : "secondary"}
                                className={`cursor-pointer ${!isPending ? "bg-green-100 text-green-700" : ""}`}
                              >
                                {status}
                              </Badge>
                            </Button>
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {editingTopIssue === row.sr_no ? (
                              <NameInputAutocomplete
                                value={editedData.who}
                                onChange={(e) => setEditedData({ ...editedData, who: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              row.who
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="text"
                              placeholder="1/h/m/l"
                              value={row.priority || ''}
                              onChange={(e) => {
                                // Update local state immediately for responsive UI
                                setTopIssues(prevIssues =>
                                  prevIssues.map(issue =>
                                    issue.sr_no === row.sr_no ? { ...issue, priority: e.target.value } : issue
                                  )
                                );
                              }}
                              onBlur={(e) => handlePriorityChange(row.sr_no, e.target.value)}
                              className="w-24 h-8 text-center"
                            />
                          </td>
                          <td className="py-2 px-2 text-sm text-muted-foreground">{row.date}</td>
                          <td className="py-2 px-2">
                            <div className="flex gap-1">
                              {editingTopIssue === row.sr_no ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUpdateTopIssue(row.sr_no)}
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingTopIssue(null)}
                                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingTopIssue(row.sr_no); setEditedData(row); }}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTopIssue(row.sr_no)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Load More Button */}
              {topIssuesPagination.loaded < topIssuesPagination.total && (
                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={() => loadTopIssues(true)} 
                    variant="outline"
                    className="w-full max-w-xs"
                  >
                    Load More ({topIssuesPagination.loaded} of {topIssuesPagination.total})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>



        {/* Kudos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-balance">Kudos</CardTitle>
            <Button size="sm" onClick={() => setIsAddingKudos(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Kudos
            </Button>
          </CardHeader>
          <CardContent>
            <div 
              ref={kudosScrollRef}
              onScroll={(e) => handleScroll(e, loadKudos, kudosPagination)}
              className="overflow-auto max-h-96 border border-gray-200 rounded"
            >
              <table className="w-full [&_td]:align-top">
                <thead className="bg-gray-800 sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Name</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">Action</th>
                    <th className="text-left py-3 px-3 font-medium text-white text-sm bg-gray-800">By Whom</th>
                    <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-white text-sm bg-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody key={selectedMonth}>
                  {isAddingKudos && (
                    <tr className="bg-accent/50">
                      <td className="py-2 px-3">
                        <NameInputWithSuggestions
                          placeholder="Name (e.g., Hisham, Rodrigo)"
                          value={newKudos.name}
                          onChange={(value) => setNewKudos({ ...newKudos, name: value })}
                          fieldName="kudos_name"
                          suggestions={nameSuggestions.kudos_name}
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          💡 Tip: Use commas to give kudos to multiple people at once
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          placeholder="What did they do?"
                          value={newKudos.action}
                          onChange={(e) => setNewKudos({ ...newKudos, action: e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <NameInputWithSuggestions
                          placeholder="By whom (optional)"
                          value={newKudos.by_whom}
                          onChange={(value) => setNewKudos({ ...newKudos, by_whom: value })}
                          fieldName="kudos_by_whom"
                          suggestions={nameSuggestions.kudos_by_whom}
                        />
                      </td>
                      <td className="py-2 px-2 text-sm text-muted-foreground">Today</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleAddKudos} disabled={isSubmittingKudos} className="h-8 px-3">
                            {isSubmittingKudos ? 'Saving...' : 'Save'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setIsAddingKudos(false);
                              setNewKudos({ name: "", action: "", by_whom: "" });
                            }} 
                            className="h-8 px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {getFilteredKudosData.map((row, index) => (
                    <tr key={`${selectedMonth}-${row._id || index}`} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="py-2 px-3 text-sm font-medium">
                        {editingKudos === row._id ? (
                          <NameInputAutocomplete
                            value={editedData.name}
                            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {editingKudos === row._id ? (
                          <Input
                            value={editedData.action}
                            onChange={(e) => setEditedData({ ...editedData, action: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.action
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {editingKudos === row._id ? (
                          <NameInputAutocomplete
                            value={editedData.by_whom}
                            onChange={(e) => setEditedData({ ...editedData, by_whom: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          row.by_whom || ""
                        )}
                      </td>
                      <td className="py-2 px-2 text-sm text-muted-foreground">{row.date}</td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          {editingKudos === row._id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateKudos(row._id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                type="button"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                type="button"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditingKudos(row)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                type="button"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteKudos(row._id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Loading indicator */}
              {isLoadingKudos && (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-muted-foreground">Loading more...</div>
                </div>
              )}
              {/* End of list indicator */}
              {kudosPagination.loaded >= kudosPagination.total && kudosPagination.total > 0 && (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-muted-foreground">All {kudosPagination.total} items loaded</div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
      
      {/* Team Rocket Celebration Modal */}
      <TeamRocketCelebration 
        show={showTeamRocketCelebration} 
        onClose={() => setShowTeamRocketCelebration(false)} 
      />
    </div>
  );
};

export default MorningMeetings;
