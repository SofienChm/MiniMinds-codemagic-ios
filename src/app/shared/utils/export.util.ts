import Swal from 'sweetalert2';

export class ExportUtil {
  static async exportToPDF(data: any[], title: string): Promise<void> {
    if (data.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No data to export',
        confirmButtonColor: '#7dd3c0'
      });
      return;
    }

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => item[h]));

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 20
    });

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  static async exportToExcel(data: any[], title: string): Promise<void> {
    if (data.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'No data to export',
        confirmButtonColor: '#7dd3c0'
      });
      return;
    }

    const [XLSX, { saveAs }] = await Promise.all([
      import('xlsx'),
      import('file-saver')
    ]);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
