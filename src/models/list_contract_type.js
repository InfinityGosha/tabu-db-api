const config = require('../config/config');
const { NotFoundError, DatabaseError } = require('../errors/customErrors');
const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client with authentication
const bigquery = new BigQuery({
  keyFilename: config.database.credentialsPath,
});
const schemaName = config.database.schema;

async function queryListContractTypeByUniqueId(unique_id) {
  const query = `
    SELECT contract_type, amount
    FROM \`${schemaName}.list_contract_type\`
    WHERE unique_id = @unique_id
    ORDER BY amount DESC
  `;
  const options = {
    query: query,
    params: { unique_id },
  };

  try {
    const [rows] = await bigquery.query(options);
    if (rows.length === 0) {
      throw new NotFoundError('Contract type data not found for the provided unique_id');
    }
    return rows;
  } catch (err) {
    console.error('ERROR:', err);
    if (err.code === 5) {
      throw new NotFoundError('Contract type data not found for the provided unique_id', err);
    }
    throw new DatabaseError('Failed to query contract_type table', err);
  }
}

module.exports = {
  queryListContractTypeByUniqueId,
};
