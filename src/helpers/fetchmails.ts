import dotenv from "dotenv";
dotenv.config();
import nodeFetch from "node-fetch";

export default async function fetchEmails(page: number, size: number, specificReqId?: string) {
  const baseUrl =
    "https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001?entityid=ETN0000041";
  const apiUrl = specificReqId
    ? `${baseUrl}&$page=${page}&$size=${size}&$filter:RecId=eq:${specificReqId}&$filter:Type=eq:Tickets`
    : `${baseUrl}&$page=${page}&$size=${size}&$orderby=CreatedDateTime&$orderbydirection=0&$filter:Type=eq:Tickets`;

  console.log(`🌐 [API_CALL] → ${apiUrl}`);

  const response = await nodeFetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${process.env.Api_token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok)
    throw new Error(`API fetch failed: ${response.status} ${response.statusText}`);

  const data:any = await response.json();
  console.log(`📦 [API_SUCCESS] Retrieved ${data?.Data?.length || 0} emails.`);
  console.log('Data:', data.Data);
  return data?.Data || [];
}