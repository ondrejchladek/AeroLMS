import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'Sešit1-test.xlsx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Process data for timeline chart
    const timelineData: any[] = [];
    
    // Sort data by time
    const sortedData = jsonData.sort((a: any, b: any) => {
      return new Date(a.datumcasOD).getTime() - new Date(b.datumcasOD).getTime();
    });

    // Create timeline segments
    sortedData.forEach((row: any, index: number) => {
      const intervalStart = new Date(row.datumcasOD);
      const intervalEnd = new Date(row.datumcasDO);
      const intervalDuration = intervalEnd.getTime() - intervalStart.getTime(); // 15 minutes in ms
      
      const runValue = row.run || 0;
      const readyValue = row.ready || 0;
      const total = 899; // Total units representing 15 minutes
      
      // If both run and ready values exist, create separate segments
      if (runValue > 0 && readyValue > 0) {
        // Running segment - starts at DatumCasRUN
        const runStartTime = new Date(row.DatumCasRUN);
        const runDuration = (runValue / total) * intervalDuration;
        const runEndTime = new Date(runStartTime.getTime() + runDuration);
        
        
        // Ready segment before running (if exists)
        if (runStartTime > intervalStart) {
          const readyBeforeDuration = runStartTime.getTime() - intervalStart.getTime();
          
          timelineData.push({
            x: 'Machine',
            y: [intervalStart.getTime(), runStartTime.getTime()],
            fillColor: 'rgb(255, 165, 0)', // Orange for ready
            status: 'ready',
            machineId: row.CisloStroj,
            machineName: row.PopisStroj,
            value: Math.round((readyBeforeDuration / intervalDuration) * total)
          });
        }
        
        // Running segment
        timelineData.push({
          x: 'Machine',
          y: [runStartTime.getTime(), runEndTime.getTime()],
          fillColor: '#00E396', // Green for running
          status: 'running',
          machineId: row.CisloStroj,
          machineName: row.PopisStroj,
          value: runValue
        });
        
        // Ready segment after running (if exists)
        if (runEndTime < intervalEnd) {
          const readyAfterDuration = intervalEnd.getTime() - runEndTime.getTime();
          
          timelineData.push({
            x: 'Machine',
            y: [runEndTime.getTime(), intervalEnd.getTime()],
            fillColor: 'rgb(255, 165, 0)', // Orange for ready
            status: 'ready',
            machineId: row.CisloStroj,
            machineName: row.PopisStroj,
            value: Math.round((readyAfterDuration / intervalDuration) * total)
          });
        }
      } else if (runValue > 0) {
        // Only running
        const runStartTime = new Date(row.DatumCasRUN);
        const runDuration = (runValue / total) * intervalDuration;
        const runEndTime = new Date(runStartTime.getTime() + runDuration);
        
        timelineData.push({
          x: 'Machine',
          y: [runStartTime.getTime(), runEndTime.getTime()],
          fillColor: '#00E396', // Green for running
          status: 'running',
          machineId: row.CisloStroj,
          machineName: row.PopisStroj,
          value: runValue
        });
      } else if (readyValue > 0) {
        // Only ready/idle - full interval when ready=899
        if (readyValue === 899) {
          // Full interval
          timelineData.push({
            x: 'Machine',
            y: [intervalStart.getTime(), intervalEnd.getTime()],
            fillColor: 'rgb(255, 165, 0)', // Orange for ready
            status: 'ready',
            machineId: row.CisloStroj,
            machineName: row.PopisStroj,
            value: readyValue
          });
        } else {
          // Partial ready time
          const readyDuration = (readyValue / total) * intervalDuration;
          const readyEndTime = new Date(intervalStart.getTime() + readyDuration);
          
          timelineData.push({
            x: 'Machine',
            y: [intervalStart.getTime(), readyEndTime.getTime()],
            fillColor: 'rgb(255, 165, 0)', // Orange for ready
            status: 'ready',
            machineId: row.CisloStroj,
            machineName: row.PopisStroj,
            value: readyValue
          });
        }
      }
      // If both run and ready are 0, it means offline - we don't add any segment
    });

    // Generate time labels for x-axis (15-minute intervals for 24 hours)
    const timeLabels: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        timeLabels.push(`${hourStr}:${minuteStr}`);
      }
    }
    
    // Calculate the date range for 24 hours view
    let minTime: number;
    let maxTime: number;
    
    if (sortedData.length > 0) {
      // Get the date from the first record
      const baseDate = new Date(sortedData[0].datumcasOD);
      baseDate.setHours(0, 0, 0, 0); // Set to midnight
      minTime = baseDate.getTime();
      
      const endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      maxTime = endDate.getTime();
    } else {
      // If no data, use today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      minTime = today.getTime();
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      maxTime = endOfDay.getTime();
    }

    // Log timeline data for debugging
    console.log('Timeline segments generated:', timelineData.length);
    timelineData.forEach((segment, idx) => {
      const start = new Date(segment.y[0]);
      const end = new Date(segment.y[1]);
      console.log(`Segment ${idx}: ${segment.status} from ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}`);
    });
    
    return NextResponse.json({
      timelineData: timelineData,
      timeLabels: timeLabels,
      minTime: minTime,
      maxTime: maxTime,
      rawData: jsonData // Include all raw data
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return NextResponse.json(
      { error: 'Failed to read Excel file' },
      { status: 500 }
    );
  }
}