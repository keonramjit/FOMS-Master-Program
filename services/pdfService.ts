



import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Flight, DispatchRecord, Aircraft } from '../types';

export const generateDailySchedulePDF = (date: string, flights: Flight[]) => {
  // Initialize PDF in Landscape mode (A4)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;
  const marginX = 14;

  // --- Header Section ---
  
  // Modern Header Background (Slate-50)
  doc.setFillColor(248, 250, 252); 
  doc.rect(0, 0, width, 40, 'F');
  
  // Left Accent Bar (Blue-600)
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 8, 40, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("DAILY FLIGHT PROGRAM", 18, 18);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'normal');
  doc.text("TRANS GUYANA AIRWAYS • FLIGHT OPERATIONS DEPARTMENT", 18, 26);

  // Date Section (Right Aligned)
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(dateStr, width - 14, 18, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'medium');
  doc.text(`GENERATED: ${new Date().toLocaleString()}`, width - 14, 26, { align: 'right' });

  // Divider Line below header
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 40, width - 14, 40);

  // --- Table Data Preparation ---
  
  // Sort by Aircraft then ETD
  const sortedFlights = [...flights].sort((a, b) => {
    // 1. Sort by Aircraft Group (C208B -> C208EX -> 1900D)
    const typePriority: Record<string, number> = { 'C208B': 1, 'C208EX': 2, '1900D': 3 };
    const typeA = typePriority[a.aircraftType] || 99;
    const typeB = typePriority[b.aircraftType] || 99;
    
    if (typeA !== typeB) return typeA - typeB;
    
    // 2. Sort by Registration
    if (a.aircraftRegistration !== b.aircraftRegistration) {
        return a.aircraftRegistration.localeCompare(b.aircraftRegistration);
    }

    // 3. Sort by ETD
    return (a.etd || '').localeCompare(b.etd || '');
  });

  const tableBody = sortedFlights.map(f => {
    const routeParts = f.route.includes('-') ? f.route.split('-') : [f.route, ''];
    // Format Notes with Customer if needed, or keep separate. 
    
    return [
        f.aircraftRegistration,
        f.aircraftType.replace('C208', '208'), // Shorten for space
        f.flightNumber.replace(/^TGY/i, ''), // Remove prefix to save space, header implies flight #
        f.customer || '--',
        routeParts[0], // From
        routeParts[1], // To
        f.etd,
        f.pic,
        f.sic,
        f.status.toUpperCase(),
        f.notes || ''
    ];
  });

  // --- AutoTable Generation ---
  
  autoTable(doc, {
    startY: 45,
    head: [['AIRCRAFT', 'TYPE', 'FLT #', 'CUSTOMER', 'DEP', 'ARR', 'ETD', 'PIC', 'SIC', 'STATUS', 'NOTES']],
    body: tableBody,
    theme: 'grid', // Uses borders for clear separation
    styles: {
        font: 'helvetica',
        fontSize: 9, // Larger font for readability
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        textColor: [30, 41, 59], // Slate-800
        lineColor: [226, 232, 240], // Slate-200
        lineWidth: 0.1,
        valign: 'middle',
        overflow: 'linebreak' // Wraps long text
    },
    headStyles: {
        fillColor: [15, 23, 42], // Slate-900 (Darker header)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 8,
        cellPadding: 3
    },
    columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 20 }, // Reg
        1: { cellWidth: 14, textColor: [100, 116, 139] }, // Type
        2: { fontStyle: 'bold', cellWidth: 15, halign: 'right' }, // Flight # (numeric part)
        3: { cellWidth: 'auto', minCellWidth: 40 }, // Customer - Grows to fill available space (Primary Goal)
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }, // From
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }, // To
        6: { halign: 'center', fontStyle: 'bold', cellWidth: 15 }, // ETD
        7: { halign: 'center', cellWidth: 12 }, // PIC
        8: { halign: 'center', cellWidth: 12 }, // SIC
        9: { halign: 'center', fontSize: 7, fontStyle: 'bold', cellWidth: 22 }, // Status
        10: { cellWidth: 50 }, // Notes - Fixed wider width for comments
    },
    alternateRowStyles: {
        fillColor: [248, 250, 252] // Very subtle Slate-50 for legibility
    },
    margin: { left: marginX, right: marginX },
    
    didParseCell: (data) => {
        // Color coding for status column
        if (data.section === 'body' && data.column.index === 9) {
            const status = data.cell.raw as string;
            if (status === 'DELAYED') {
                data.cell.styles.textColor = [180, 83, 9]; // Amber-700
                data.cell.styles.fillColor = [254, 252, 232]; // Amber-50
            }
            else if (status === 'CANCELLED') {
                data.cell.styles.textColor = [190, 18, 60]; // Rose-700
                data.cell.styles.fillColor = [255, 241, 242]; // Rose-50
            }
            else if (status === 'COMPLETED') {
                data.cell.styles.textColor = [21, 128, 61]; // Green-700
                data.cell.styles.fillColor = [240, 253, 244]; // Green-50
            }
        }
    }
  });

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(14, height - 15, width - 14, height - 15);

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(
          `Page ${i} of ${pageCount}`, 
          14, height - 10
      );
      doc.text(
        "TGA Flight Operations Management System", 
        width - 14, height - 10, 
        { align: 'right' }
      );
  }

  // Save
  doc.save(`TGA_Schedule_${date}.pdf`);
};

export const generateDispatchPack = (flight: Flight, dispatch: DispatchRecord, aircraft: Aircraft | undefined) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor = [37, 99, 235]; // Blue-600
    const slateColor = [100, 116, 139]; // Slate-500

    const drawHeader = (title: string) => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("FOMS", 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text("FLIGHT DISPATCH RELEASE", 14, 20);
        
        doc.setFontSize(24);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(title, 196, 18, { align: 'right' });
        doc.line(14, 25, 196, 25);
    };

    // --- PAGE 1: LOAD SHEET & FLIGHT PLAN ---
    drawHeader("LOAD SHEET");

    // Flight Info Block
    const infoY = 35;
    doc.setFontSize(10);
    doc.setTextColor(0,0,0);
    
    const infoData = [
        ['Flight No:', flight.flightNumber, 'Date:', flight.date],
        ['Aircraft:', `${flight.aircraftRegistration} (${flight.aircraftType})`, 'PIC:', flight.pic],
        ['From:', flight.route.split('-')[0] || '---', 'To:', flight.route.split('-')[1] || '---'],
        ['ETD:', flight.etd, 'Flight Time:', `${flight.flightTime} HRS`]
    ];

    autoTable(doc, {
        startY: infoY,
        body: infoData,
        theme: 'plain',
        styles: { cellPadding: 1, fontSize: 10, font: 'helvetica' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 60 },
            2: { fontStyle: 'bold', cellWidth: 20 },
            3: { cellWidth: 60 }
        }
    });

    // Weights Table
    const weightsY = 60;
    doc.text("WEIGHT & BALANCE", 14, weightsY);
    
    const takeoffWeight = dispatch.takeoffWeight || 0;
    const mtow = aircraft?.maxTakeoffWeight || 0;
    const isOverweight = takeoffWeight > mtow;

    autoTable(doc, {
        startY: weightsY + 2,
        head: [['Item', 'Weight (LBS)', 'Max Limit', 'Status']],
        body: [
            ['Basic Empty Weight', dispatch.basicEmptyWeight, '-', '-'],
            ['Payload (Pax + Cargo)', (dispatch.zeroFuelWeight || 0) - dispatch.basicEmptyWeight, '-', '-'],
            ['Zero Fuel Weight', dispatch.zeroFuelWeight, aircraft?.maxZeroFuelWeight || '-', (dispatch.zeroFuelWeight || 0) > (aircraft?.maxZeroFuelWeight || 99999) ? 'FAIL' : 'OK'],
            ['Fuel Load', dispatch.fuel.totalFob, '-', '-'],
            ['Takeoff Weight', takeoffWeight, mtow, isOverweight ? 'OVERWEIGHT' : 'OK'],
            ['Est. Landing Weight', dispatch.landingWeight, aircraft?.maxLandingWeight || '-', 'OK']
        ],
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] }
    });

    // Pax Manifest
    doc.text("PASSENGER MANIFEST", 14, (doc as any).lastAutoTable.finalY + 10);
    const paxData = dispatch.passengers.map(p => [
        p.lastName.toUpperCase(), 
        p.firstName.toUpperCase(), 
        p.weight, 
        p.seatNumber || '-',
        p.passportNumber || '-',
        p.isInfant ? 'Y' : 'N'
    ]);
    
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        head: [['Last Name', 'First Name', 'Weight', 'Seat', 'Passport', 'Inf']],
        body: paxData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
    });

    // Cargo Manifest
    doc.text("CARGO MANIFEST", 14, (doc as any).lastAutoTable.finalY + 10);
    const cargoData = dispatch.cargoItems.map(c => [
        c.consignor, 
        c.consignee, 
        c.destination,
        c.pieces,
        c.weight,
        c.description
    ]);
    
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        head: [['Consignor', 'Consignee', 'Dest', 'Pcs', 'Wgt', 'Note']],
        body: cargoData.length > 0 ? cargoData : [['--', '--', '--', 0, 0, 'No Cargo']],
        theme: 'grid',
    });

    // --- PAGE 2: FLIGHT LOG & SIGNATURES ---
    doc.addPage();
    drawHeader("FLIGHT LOG");

    // Flight Plan Info
    const route = dispatch.filedRoute || '';
    const alt = dispatch.cruisingAltitude || '';
    const speed = dispatch.tas ? `${dispatch.tas} KTS` : '';
    const endurance = dispatch.endurance || '';
    const pob = dispatch.pob || '-';

    autoTable(doc, {
        startY: 35,
        head: [['Filed Route', 'Altitude', 'TAS', 'Endurance', 'POB']],
        body: [[route, alt, speed, endurance, pob]],
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] }
    });

    // Fuel Plan
    doc.text("FUEL PLAN", 14, (doc as any).lastAutoTable.finalY + 10);
    const fuel = dispatch.fuel;
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 12,
        head: [['Type', 'Amount (LBS)']],
        body: [
            ['Taxi Fuel', fuel.taxi],
            ['Trip Fuel', fuel.trip],
            ['Contingency', fuel.contingency],
            ['Alternate', fuel.alternate],
            ['Holding', fuel.holding],
            ['TOTAL FOB', { content: fuel.totalFob, styles: { fontStyle: 'bold' } }]
        ],
        theme: 'plain',
        columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } }
    });

    // Signatures
    const sigY = 220;
    doc.setFontSize(10);
    doc.text("I hereby certify that the above information is correct and the flight has been dispatched in accordance with regulations.", 14, sigY);
    
    doc.rect(14, sigY + 10, 80, 20); // Box 1
    doc.text("DISPATCHER SIGNATURE", 16, sigY + 16);
    doc.text(dispatch.releasedBy || "Authorized Dispatcher", 16, sigY + 26);

    doc.rect(110, sigY + 10, 80, 20); // Box 2
    doc.text("PILOT IN COMMAND", 112, sigY + 16);
    doc.text("Acceptance of Load & Plan", 112, sigY + 26);

    doc.save(`Dispatch_${flight.flightNumber}_${flight.date}.pdf`);
}