// Variables globales
let tableData = {};
let tableGenerated = false;
let currentSection = 'flexi';

// Función para cambiar entre secciones
function switchSection(section) {
    currentSection = section;
    
    // Ocultar todas las secciones
    document.getElementById('flexiSection').style.display = 'none';
    document.getElementById('pp6Section').style.display = 'none';
    
    // Mostrar la sección seleccionada
    if (section === 'flexi') {
        document.getElementById('flexiSection').style.display = 'block';
    } else if (section === 'pp6') {
        document.getElementById('pp6Section').style.display = 'block';
    }
    
    // Actualizar botones activos
    document.querySelectorAll('.topbar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
}

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

    // Ancho de referencia: el del contenedor visible de la app
    const appContainer = document.querySelector('.container');
    const targetWidth = appContainer ? appContainer.offsetWidth : 1200;

    // Crear contenedor temporal con ambas tablas, manteniendo el mismo ancho
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0';
    tempContainer.style.left = '-9999px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '30px';
    tempContainer.style.width = `${targetWidth}px`;
    tempContainer.style.boxSizing = 'border-box';

    // Clonar tabla principal y asegurar que sea visible en el clon
    const mainClone = tableContainer.cloneNode(true);
    mainClone.style.display = 'block';
    tempContainer.appendChild(mainClone);

    // Separador visual entre tablas
    const spacer = document.createElement('div');
    spacer.style.height = '24px';

    // Agregar la tabla de Fees si está marcada
    const showFeesCheckbox = document.getElementById('showFeesTable');
    if (showFeesCheckbox && showFeesCheckbox.checked) {
        const feesTableContainer = document.getElementById('feesTableContainer');
        if (feesTableContainer && feesTableContainer.querySelector('table')) {
            tempContainer.appendChild(spacer);
            const feesClone = feesTableContainer.cloneNode(true);
            feesClone.style.display = 'block';
            tempContainer.appendChild(feesClone);
        }
    }

    document.body.appendChild(tempContainer);

    const runCapture = () => html2canvas(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = `tabla-flexi-${new Date().getTime()}.jpg`;
        link.click();
        document.body.removeChild(tempContainer);
    }).catch(err => {
        console.error('Error al generar imagen:', err);
        alert('Error al descargar la tabla como imagen');
        document.body.removeChild(tempContainer);
    });

    // Cargar html2canvas solo si no está disponible
    if (window.html2canvas) {
        runCapture();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = runCapture;
        document.head.appendChild(script);
    }
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

// ========== FUNCIONES PARA PP6 ==========

let pp6TableGenerated = false;

// Parsear datos del textarea de PP6
function parsePP6Data() {
    const textarea = document.getElementById('pp6Data');
    const data = textarea.value.trim();
    
    if (!data) {
        alert('Por favor, pega los datos en el textarea');
        return null;
    }
    
    const lines = data.split('\n').filter(line => line.trim() !== '');
    const rows = [];
    
    // Saltar la primera línea si es el encabezado
    const startIndex = lines[0].toLowerCase().includes('total amount') || lines[0].toLowerCase().includes('monthly fee') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        // Separar por tabulación o múltiples espacios
        const parts = line.split(/\t+|\s{2,}/).filter(part => part.trim() !== '');
        
        if (parts.length >= 2) {
            const totalAmount = parts[0].trim();
            const monthlyFee = parts[parts.length - 1].trim();
            rows.push({ totalAmount, monthlyFee });
        }
    }
    
    return rows;
}

// Generar tabla PP6
function generatePP6Table() {
    const rows = parsePP6Data();
    
    if (!rows || rows.length === 0) {
        alert('No se pudieron procesar los datos. Asegúrate de que el formato sea correcto.');
        return;
    }
    
    let html = '<table>';
    
    // Encabezado
    html += '<thead><tr>';
    html += '<th>Total Amount</th>';
    html += '<th class="fee-header">Monthly Fee</th>';
    html += '</tr></thead>';
    
    // Cuerpo
    html += '<tbody>';
    
    rows.forEach(row => {
        html += '<tr>';
        html += `<td class="row-header">${row.totalAmount}</td>`;
        html += `<td contenteditable="true">${row.monthlyFee}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    const pp6TableContainer = document.getElementById('pp6TableContainer');
    const fullContent = `
        <div class="table-content">
            <img src="https://cdn.prod.website-files.com/62b803c519da726951bd71c2/62b803c519da72c35fbd72a2_Logo.svg" alt="Logo" class="table-logo">
            <h2>PP6 - Fee Structure</h2>
        </div>
        ${html}
    `;
    pp6TableContainer.innerHTML = fullContent;
    pp6TableContainer.classList.add('show');
    
    pp6TableGenerated = true;
    document.getElementById('downloadPP6Btn').disabled = false;
}

// Descargar tabla PP6 como imagen
async function downloadPP6TableAsImage() {
    if (!pp6TableGenerated) {
        alert('Primero debes generar la tabla');
        return;
    }

    const tableContainer = document.getElementById('pp6TableContainer');
    
    try {
        // Importar html2canvas dinámicamente
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        const canvas = await html2canvas(tableContainer, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `pp6-fee-structure-${new Date().getTime()}.jpg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('Error al generar la imagen:', error);
        alert('Hubo un error al generar la imagen. Por favor, intenta de nuevo.');
    }
}
