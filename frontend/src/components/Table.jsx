function Table({ headers, rows }) {
  return (
    <table>
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length ? rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
          </tr>
        )) : (
          <tr>
            <td colSpan={headers.length}>No records found.</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

export default Table
