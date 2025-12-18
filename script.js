// Variables globales
let tableData = {};
let tableGenerated = false;

// Obtener los valores seleccionados del formulario
function getSelectedValues() {
    const countries = Array.from(document.querySelectorAll('input[name="countries"]:checked'))
        .map(el => el.value);
    
    const fees = Array.from(document.querySelectorAll('input[name="fees"]:checked'))
        .map(el => parseInt(el.value))
        .sort((a, b) => a - b);
    
    const servicingFee = document.getElementById('servicingFee').value || '0';
    const assumedText = document.getElementById('assumedText').value || 'ASSUMED BY SHOPPER';
    
    return { countries, fees, servicingFee, assumedText };
}

// Generar la tabla dinámicamente
function generateTable() {
    const { countries, fees, servicingFee, assumedText } = getSelectedValues();
    
    if (countries.length === 0 || fees.length === 0) {
        alert('Por favor, selecciona al menos un país y un fee');
        return;
    }
    
    // Guardar los datos para exportar
    tableData = {
        countries,
        fees,
        servicingFee,
        assumedText,
        generatedAt: new Date().toLocaleString('es-ES')
    };

    let html = '<table>';
    
    // Encabezado
    html += '<thead><tr>';
    html += '<th>FLEXI</th>';
    fees.forEach(fee => {
        html += `<th class="fee-header">${fee}</th>`;
    });
    html += '</tr></thead>';
    
    // Cuerpo
    html += '<tbody>';
    
    countries.forEach(country => {
        // Fila del país
        html += `<tr><td class="country-row" colspan="${fees.length + 1}">${country}</td></tr>`;
        
        // Fila: % of the Servicing Fees
        html += '<tr>';
        html += '<td class="row-header">% of the Servicing Fees</td>';
        fees.forEach(fee => {
            html += `<td contenteditable="true" onblur="updateTableData(this, '${country}', ${fee}, 'servicing')">${servicingFee}</td>`;
        });
        html += '</tr>';
        
        // Fila: % of the Financing Fees
        html += '<tr>';
        html += '<td class="row-header">% of the Financing Fees</td>';
        fees.forEach(fee => {
            const isThreeMonth = fee === 3;
            const financingValue = isThreeMonth ? '0' : assumedText;
            const cellClass = isThreeMonth ? '' : 'assumed-cell';
            html += `<td contenteditable="true" class="${cellClass}" onblur="updateTableData(this, '${country}', ${fee}, 'financing')">${financingValue}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    const tableContainer = document.getElementById('tableContainer');
    const fullContent = `
        <div class="table-content">
            <img src="https://cdn.prod.website-files.com/62b803c519da726951bd71c2/62b803c519da72c35fbd72a2_Logo.svg" alt="Logo" class="table-logo">
            <h2>Table of Fees</h2>
        </div>
        ${html}
    `;
    tableContainer.innerHTML = fullContent;
    tableContainer.classList.add('show');
    
    tableGenerated = true;
    document.getElementById('downloadBtn').disabled = false;
}

// Actualizar datos de la tabla (para edición)
function updateTableData(cell, country, fee, type) {
    // Las celdas son editables, simplemente guardamos el cambio
    console.log(`Actualizado: ${country} - ${fee} meses - ${type}: ${cell.textContent}`);
}

// Exportar datos a JSON
function exportToJSON() {
    const { countries, fees, servicingFee, assumedText } = getSelectedValues();
    
    const tableStructure = {};
    
    countries.forEach(country => {
        tableStructure[country] = {};
        fees.forEach(fee => {
            tableStructure[country][fee] = {
                servicing_fee: servicingFee,
                financing_fee: assumedText
            };
        });
    });
    
    const dataToExport = {
        metadata: {
            generatedAt: new Date().toISOString(),
            countries,
            fees,
        },
        table: tableStructure
    };
    
    // Obtener los valores editados de la tabla si existen
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const firstCell = cells[0].textContent;
            
            // Si es una fila de país, saltar
            if (countries.includes(firstCell)) return;
            
            // Si es una fila de valores
            if (firstCell.includes('Servicing') || firstCell.includes('Financing')) {
                const type = firstCell.includes('Servicing') ? 'servicing_fee' : 'financing_fee';
                let feeIndex = 0;
                
                // Encontrar el país actual (fila anterior)
                let countryFound = null;
                for (let i = index - 1; i >= 0; i--) {
                    const prevRow = document.querySelectorAll('table tbody tr')[i];
                    const prevFirstCell = prevRow.querySelectorAll('td')[0].textContent;
                    if (countries.includes(prevFirstCell)) {
                        countryFound = prevFirstCell;
                        break;
                    }
                }
                
                if (countryFound) {
                    fees.forEach((fee, idx) => {
                        const value = cells[idx + 1].textContent;
                        if (tableStructure[countryFound]) {
                            if (tableStructure[countryFound][fee]) {
                                tableStructure[countryFound][fee][type] = value;
                            }
                        }
                    });
                }
            }
        }
    });
    
    dataToExport.table = tableStructure;
    
    // Crear archivo JSON y descargarlo
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabla-flexi-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log('JSON exportado:', dataToExport);
}

// Exportar a CSV
function exportToCSV() {
    const { countries, fees } = getSelectedValues();
    
    let csv = 'FLEXI,' + fees.join(',') + '\n';
    
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => cell.textContent.replace(/,/g, ''));
        csv += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabla-flexi-${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Descargar tabla como JPG
function downloadTableAsImage() {
    if (!tableGenerated) {
        alert('Por favor, genera la tabla primero');
        return;
    }

    const tableContainer = document.getElementById('tableContainer');
    if (!tableContainer || !tableContainer.querySelector('table')) {
        alert('No hay tabla para descargar');
        return;
    }

    // Crear contenedor temporal con ambas tablas
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '30px';
    
    // Copiar la tabla principal
    tempContainer.appendChild(tableContainer.cloneNode(true));
    
    // Agregar la tabla de Fees si está marcada
    const showFeesCheckbox = document.getElementById('showFeesTable');
    if (showFeesCheckbox && showFeesCheckbox.checked) {
        const feesTableContainer = document.getElementById('feesTableContainer');
        if (feesTableContainer && feesTableContainer.querySelector('table')) {
            tempContainer.appendChild(feesTableContainer.cloneNode(true));
        }
    }
    
    document.body.appendChild(tempContainer);

    // Usar html2canvas para capturar todo el contenedor (logo, título y tabla)
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = function() {
        html2canvas(tempContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            allowTaint: true
        }).then(canvas => {
            // Convertir a JPG y descargar
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.download = `tabla-flexi-${new Date().getTime()}.jpg`;
            link.click();
            
            // Eliminar contenedor temporal
            document.body.removeChild(tempContainer);
        }).catch(err => {
            console.error('Error al generar imagen:', err);
            alert('Error al descargar la tabla como imagen');
            document.body.removeChild(tempContainer);
        });
    };
    document.head.appendChild(script);
}

// Toggle para mostrar/ocultar tabla de Fees > 3000€
function toggleFeesTable() {
    const checkbox = document.getElementById('showFeesTable');
    const feesTableContainer = document.getElementById('feesTableContainer');
    
    if (checkbox.checked) {
        generateFeesTable();
        feesTableContainer.style.display = 'block';
    } else {
        feesTableContainer.style.display = 'none';
    }
}

// Generar tabla de Fees > 3000€ con valores fijos
function generateFeesTable() {
    const feesData = {
        installments: [3, 6, 9, 12],
        from: '3,001.00 €',
        percentages: {
            3: '3.45%',
            6: '4.45%',
            9: '5.55%',
            12: '5.75%'
        },
        transactionCost: '0.00 €'
    };
    
    let html = '<table>';
    
    // Encabezado
    html += '<thead><tr>';
    html += '<th>Instalments</th>';
    feesData.installments.forEach(installment => {
        html += `<th class="fee-header">${installment}</th>`;
    });
    html += '</tr></thead>';
    
    // Cuerpo
    html += '<tbody>';
    
    // Fila: From
    html += '<tr>';
    html += '<td class="row-header">From</td>';
    feesData.installments.forEach(() => {
        html += `<td>${feesData.from}</td>`;
    });
    html += '</tr>';
    
    // Fila: Percentage
    html += '<tr>';
    html += '<td class="row-header">Percentage</td>';
    feesData.installments.forEach(installment => {
        html += `<td>${feesData.percentages[installment]}</td>`;
    });
    html += '</tr>';
    
    // Fila: Transaction Cost
    html += '<tr>';
    html += '<td class="row-header">Transaction Cost</td>';
    feesData.installments.forEach(() => {
        html += `<td>${feesData.transactionCost}</td>`;
    });
    html += '</tr>';
    
    html += '</tbody></table>';
    
    const feesTableContainer = document.getElementById('feesTableContainer');
    const fullContent = `
        <div class="table-content">
            <h2>Fees > 3000€</h2>
        </div>
        ${html}
    `;
    feesTableContainer.innerHTML = fullContent;
}

// Generar tabla al cargar la página (deshabilitado)
document.addEventListener('DOMContentLoaded', function() {
    // No generar tabla automáticamente
});
