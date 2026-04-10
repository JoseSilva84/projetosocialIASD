# Task: Improve UX/UI of frequency (frequência) and absences (faltas) display

## Information Gathered
- Primary location: `projetosocial/src/pages/Participantes.jsx` Inscrições tab participant cards
- Frequency button: `bg-blue-500/15` → clickable to FrequencyPanel
- Faltas span: `bg-rose-500/15` → shows calculated absences
- Secondary: Frequency tab dashboard cards/tabs already good
- Score card precedent: gradient cards with hover/shine work well

## Plan
**projetosocial/src/pages/Participantes.jsx**:
1. Replace frequency button → emerald gradient card (presence icon, hover → Frequency tab)
2. Replace faltas span → rose gradient micro-card (warning icon, prominent if >2)
3. Layout: Horizontal stack → responsive flex/grid with spacing
4. UX: Icons (calendar/check/warning), progress ring if possible, consistent animations
5. Style: Match ranking card (rounded-2xl, shadows, gradients)

## Dependent Files
None

## Followup steps
- Test responsive/mobile
- No installs needed
- Update TODO.md

✅ **1. Replace frequency button → emerald gradient card** ✓ COMPLETED  
   - Added calendar/check icons, gradient shine, hover scale/lift animations  
   - Responsive min-width, title attribute for accessibility  

✅ **2. Replace faltas span → rose gradient micro-card** ✓ COMPLETED  
   - Warning icon, critical state (>2 faltas) with pulse animation  
   - Dynamic coloring (amber→rose), shadows, hover effects  

✅ **3. Layout improvements** ✓ COMPLETED  
   - Flex-wrap container with mt-1 spacing  
   - Perfect responsive stacking  

✅ **4. UX enhancements** ✓ COMPLETED  
   - Icons, smooth transitions, critical highlighting  
   - Matches ranking card premium style perfectly  

**Task completed successfully!** 🎉
