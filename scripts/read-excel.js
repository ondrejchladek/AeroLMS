const XLSX = require('xlsx');
const path = require('path');

// Read Excel file
const filePath = path.join(__dirname, '..', 'Sešit1-test.xlsx');
const workbook = XLSX.readFile(filePath);

// Get first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Display analysis
console.log('Excel File Analysis:');
console.log('--------------------');
console.log('Sheet name:', sheetName);
console.log('Number of rows:', data.length);
console.log('Number of columns:', data[0] ? data[0].length : 0);
console.log('\nFirst 10 rows:');
console.log(JSON.stringify(data.slice(0, 10), null, 2));

// Convert to JSON with headers
const jsonData = XLSX.utils.sheet_to_json(worksheet);
console.log('\nAs JSON with headers:');
console.log(JSON.stringify(jsonData.slice(0, 5), null, 2));

// Show last row with calculations
console.log('\n\nLast row analysis:');
const lastRow = jsonData[jsonData.length - 1];
console.log('Last row data:', JSON.stringify(lastRow, null, 2));

if (lastRow.run > 0 && lastRow.ready > 0) {
  const total = 899;
  const intervalMinutes = 15;
  
  const runMinutes = (lastRow.run / total) * intervalMinutes;
  const readyMinutes = (lastRow.ready / total) * intervalMinutes;
  
  console.log(`\nTime distribution in last interval (${lastRow.datumcasOD} to ${lastRow.datumcasDO}):`);
  console.log(`- Running: ${lastRow.run}/${total} = ${runMinutes.toFixed(2)} minutes`);
  console.log(`- Ready: ${lastRow.ready}/${total} = ${readyMinutes.toFixed(2)} minutes`);
  console.log(`- Total: ${runMinutes.toFixed(2)} + ${readyMinutes.toFixed(2)} = ${(runMinutes + readyMinutes).toFixed(2)} minutes`);
  console.log(`- Running starts at: ${lastRow.DatumCasRUN}`);
  
  const runStart = new Date(lastRow.DatumCasRUN);
  const runEnd = new Date(runStart.getTime() + runMinutes * 60 * 1000);
  console.log(`- Running period: ${runStart.toLocaleTimeString('cs-CZ')} to ${runEnd.toLocaleTimeString('cs-CZ')}`);
}