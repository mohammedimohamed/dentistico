export function downloadCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Include all relevant columns: ID, Name, Phone, Age, City, and Current Balance.
    const exportData = data.map(patient => ({
        'ID': patient.id,
        'Nom Complet': patient.full_name,
        'Téléphone': patient.phone || '',
        'Âge': patient.age || '',
        'Ville': patient.city || '',
        'Solde Actuel': patient.net_balance || 0
    }));

    const headers = Object.keys(exportData[0]);
    
    // Create CSV content
    let csvContent = '\uFEFF'; // BOM for UTF-8 Excel compatibility
    
    // Add header row
    csvContent += headers.join(';') + '\r\n';
    
    // Add data rows
    exportData.forEach(row => {
        const rowData = headers.map(header => {
            let cellData = (row as any)[header];
            
            // Handle null/undefined
            if (cellData === null || cellData === undefined) {
                return '""';
            }
            
            // Convert to string and handle quotes/semicolons
            const cellString = String(cellData);
            if (cellString.includes(';') || cellString.includes('"') || cellString.includes('\n')) {
                return `"${cellString.replace(/"/g, '""')}"`;
            }
            
            return cellString;
        });
        
        csvContent += rowData.join(';') + '\r\n';
    });
    
    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
