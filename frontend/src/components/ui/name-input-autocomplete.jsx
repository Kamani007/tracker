"use client"

import { useState, useRef, useEffect } from "react"
import { TEAM_MEMBERS } from "@/lib/constants"

// Simple fuzzy match function
const fuzzyMatch = (input, target) => {
  const inputLower = input.toLowerCase().replace(/[^a-z]/g, '')
  const targetLower = target.toLowerCase().replace(/[^a-z]/g, '')
  
  // Exact match
  if (inputLower === targetLower) return 100
  
  // Contains match
  if (targetLower.includes(inputLower)) return 80
  
  // Calculate similarity score based on common characters
  let matches = 0
  for (let char of inputLower) {
    if (targetLower.includes(char)) matches++
  }
  
  return (matches / Math.max(inputLower.length, targetLower.length)) * 70
}

// Get best matching names
const getMatchingNames = (input) => {
  if (!input || input.trim().length < 2) return []
  
  const matches = TEAM_MEMBERS.map(name => ({
    name,
    score: fuzzyMatch(input, name)
  }))
  .filter(m => m.score > 50) // Threshold for matching
  .sort((a, b) => b.score - a.score)
  
  return matches.slice(0, 5) // Top 5 matches
}

export default function NameInputAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Type name...", 
  className = "",
  onBlur,
  ...props 
}) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(e)
    
    if (newValue.trim().length >= 2) {
      const matches = getMatchingNames(newValue)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (name) => {
    const syntheticEvent = {
      target: { value: name }
    }
    onChange(syntheticEvent)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onBlur={onBlur}
        {...props}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 border border-border rounded-md shadow-lg max-h-40 overflow-y-auto"
          style={{ backgroundColor: '#1f2937' }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectSuggestion(suggestion.name)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors cursor-pointer text-white bg-gray-800"
              style={{ backgroundColor: index % 2 === 0 ? '#1f2937' : '#374151' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#1f2937' : '#374151'}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
