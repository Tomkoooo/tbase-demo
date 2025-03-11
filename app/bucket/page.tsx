"use client";

import { useState } from "react";
import { mongoClient } from "@/utils/bundlers"; // Adjust path to your mongoClient

export default function Home() {
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [manualBucketId, setManualBucketId] = useState<string>(""); // For manual bucket input
  const [fileId, setFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<
    { id: string; fileName: string; fileType: string; createdAt: string; updatedAt: string }[]
  >([]);
  const [retrievedFile, setRetrievedFile] = useState<
    { fileName: string; fileType: string; fileData: ArrayBuffer } | null
  >(null);
  const [status, setStatus] = useState<string>("");

  const handleCreateBucket = async () => {
    if (!mongoClient) return;
    try {
      setStatus("Creating bucket...");
      const newBucketId = await mongoClient.createBucket();
      setBucketId(newBucketId);
      setManualBucketId(newBucketId); // Sync manual input
      setStatus(`Bucket created: ${newBucketId}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleSetManualBucket = () => {
    if (!manualBucketId.trim()) {
      setStatus("Error: Please enter a valid bucket ID");
      return;
    }
    setBucketId(manualBucketId);
    setStatus(`Bucket set manually: ${manualBucketId}`);
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!mongoClient || !bucketId || !event.target.files) return;
    const file = event.target.files[0];
    const extension = file?.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = async () => {
      const fileData = reader.result as ArrayBuffer;
      try {
        setStatus("Uploading file...");
        let fileType = file.type;
        if (!fileType && extension) {
          const mimeTypes: { [key: string]: string } = {
            txt: "text/plain",
            pdf: "application/pdf",
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            mp4: "video/mp4",
          };
          fileType = mimeTypes[extension] || "application/octet-stream";
        }

        const uploadedFileId = await mongoClient.uploadFile(bucketId, {
          name: file.name,
          type: fileType,
          data: fileData,
        });
        setFileId(uploadedFileId);
        setStatus(`File uploaded: ${uploadedFileId}`);
        handleListFiles();
      } catch (error: any) {
        setStatus(`Error: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleListFiles = async () => {
    if (!mongoClient || !bucketId) return;
    try {
      setStatus("Listing files...");
      const fileList = await mongoClient.listFiles(bucketId);
      console.log(fileList);
      setFiles(fileList);
      setStatus(`Listed ${fileList.length} files`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleGetFile = async (fileId: string) => {
    if (!mongoClient || !bucketId) return;
    try {
      setStatus(`Retrieving file ${fileId}...`);
      const file = await mongoClient.getFile(bucketId, fileId);
      setRetrievedFile(file);
      setStatus(`Retrieved file: ${file.fileName}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!mongoClient || !bucketId) return;
    try {
      setStatus(`Deleting file ${fileId}...`);
      await mongoClient.deleteFile(bucketId, fileId);
      setStatus(`File ${fileId} deleted`);
      handleListFiles();
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  const handleListBuckets = async () => {
    if (!mongoClient) return;
    try {
      setStatus("Listing buckets...");
      const buckets = await mongoClient.listBuckets();
      setStatus(`Listed ${buckets.length} buckets: ${buckets.join(", ")}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };
  
  const handleDeleteBucket = async () => {
    if (!mongoClient || !bucketId) return;
    try {
      setStatus(`Deleting bucket ${bucketId}...`);
      await mongoClient.deleteBucket(bucketId);
      setBucketId(null);
      setManualBucketId("");
      setFiles([]);
      setStatus(`Bucket ${bucketId} deleted`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };
  
  const handleRenameBucket = async () => {
    if (!mongoClient || !bucketId || !manualBucketId || manualBucketId === bucketId) return;
    try {
      setStatus(`Renaming bucket ${bucketId} to ${manualBucketId}...`);
      await mongoClient.renameBucket(bucketId, manualBucketId);
      setBucketId(manualBucketId);
      setStatus(`Bucket renamed to ${manualBucketId}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-4xl font-extrabold text-center text-indigo-600 ">Bucket API Tester</h1>
        <span className="text-black text-center mb-8 flex">Bucket API file manager without any api endpoints or previous setups, only by using the database client classes. (mongoClient or mysqlClient)</span>

        {/* Bucket Management */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Bucket Management</h2>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={handleCreateBucket}
                className="bg-indigo-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-600 disabled:bg-gray-300 transition duration-200"
                disabled={!mongoClient}
              >
                Create New Bucket
              </button>
              <button
                onClick={handleListBuckets}
                className="bg-teal-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-teal-600 disabled:bg-gray-300 transition duration-200"
                disabled={!mongoClient}
              >
                List Buckets
              </button>
            </div>
            <label className="bg-white text-black group border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-400 flex items-center gap-2 p-1 shadow-sm hover:shadow-md transition-shadow duration-200">
              <span className="bg-gray-100 text-gray-700 px-3 py-2 rounded-l-lg font-medium">bucket_</span>
              <input
                type="text"
                value={manualBucketId}
                onChange={(e) => setManualBucketId(e.target.value)}
                placeholder="Bucket ID"
                className="grow bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400"
              />
              <button
                onClick={handleSetManualBucket}
                className="bg-purple-500 text-white px-4 py-2 rounded-r-lg shadow-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition duration-200"
              >
                Set Bucket
              </button>
            </label>
            <div className="flex space-x-4">
              <button
                onClick={handleRenameBucket}
                className="bg-yellow-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-yellow-600 disabled:bg-gray-300 transition duration-200"
                disabled={!bucketId || !manualBucketId || manualBucketId === bucketId}
              >
                Rename Bucket
              </button>
              <button
                onClick={handleDeleteBucket}
                className="bg-red-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-600 disabled:bg-gray-300 transition duration-200"
                disabled={!bucketId}
              >
                Delete Bucket
              </button>
            </div>
          </div>
          <p className="mt-2 text-gray-600">
            Current Bucket ID: <span className="font-semibold text-indigo-600">{bucketId || "None"}</span>
          </p>
        </section>
  

        {/* File Upload */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Upload File</h2>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              onChange={handleUploadFile}
              className="p-2 border text-black border-gray-300 rounded-lg bg-gray-50"
              disabled={!bucketId}
            />
          </div>
          <p className="mt-2 text-gray-600">Upload Status: <span className="font-semibold text-indigo-600">{fileId ? `File ID: ${fileId}` : "None"}</span></p>
        </section>

        {/* File List */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">File List</h2>
          <button
            onClick={handleListFiles}
            className="bg-green-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-300 transition duration-200"
            disabled={!bucketId}
          >
            List Files
          </button>
          <ul className="mt-4 space-y-3">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition duration-200"
              >
                <span className="text-gray-700">{file.fileName} <span className="text-gray-500">({file.fileType})</span></span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleGetFile(file.id)}
                    className="bg-blue-400 text-white px-4 py-1 rounded-lg hover:bg-blue-500 transition duration-200"
                  >
                    Get
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="bg-red-400 text-white px-4 py-1 rounded-lg hover:bg-red-500 transition duration-200"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Retrieved File */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Retrieved File</h2>
          {retrievedFile ? (
            <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
              <p className="text-gray-700"><strong>Name:</strong> <span className="text-indigo-600">{retrievedFile.fileName}</span></p>
              <p className="text-gray-700"><strong>Type:</strong> <span className="text-indigo-600">{retrievedFile.fileType}</span></p>
              {retrievedFile.fileType === "text/plain" ? (
                <p className="text-gray-700"><strong>Content:</strong> <span className="text-indigo-600">{new TextDecoder().decode(retrievedFile.fileData)}</span></p>
              ) : (
                <p className="text-gray-700"><strong>Data:</strong> <span className="text-indigo-600">Binary data (size: {retrievedFile.fileData.byteLength} bytes)</span></p>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No file retrieved yet</p>
          )}
        </section>

        {/* Status */}
        <section>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Status</h2>
          <p className="text-gray-600 bg-gray-50 p-3 rounded-lg shadow-sm">{status || "Idle"}</p>
        </section>
      </div>
    </div>
  );
}