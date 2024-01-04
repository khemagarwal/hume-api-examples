import { Emotion } from "../../lib/data/emotion";
import { None } from "../../lib/utilities/typeUtilities";
import { getEmotionDescriptor } from "../../lib/utilities/emotionUtilities";
import { useStableEmotions } from "../../lib/hooks/stability";
import * as XLSX from 'xlsx'; // Import the xlsx library
import { useEffect, useRef, useState } from "react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import domtoimage from 'dom-to-image';


type DescriptorProps = {
  className?: string;
  emotions: Emotion[];
};



export function Descriptor({ className, emotions }: DescriptorProps) {
  const emotionDistThreshold = 0.1;
  const embeddingDistThreshold = 0.2;
  const stableEmotions = useStableEmotions(emotions, embeddingDistThreshold);
  const [recording, setRecording] = useState(false);
  const [recordedData, setRecordedData] = useState([]);
  const [isStarted, setIsStarted] = useState(false);
  let intervalId: NodeJS.Timeout;
  className = className || "";

  function createDescription(emotions: Emotion[]): string {
    emotions.sort((a, b) => (a.score < b.score ? 1 : -1));
    if (emotions.length < 2) return "";

    const primaryEmotion = emotions[0];
    let secondaryEmotion = emotions[1];
    let secondaryDescriptor = "";
    for (let i = 1; i < emotions.length; i++) {
      const emotion = emotions[i];
      const descriptor = getEmotionDescriptor(emotion.name);
      if (descriptor !== None) {
        secondaryDescriptor = descriptor;
        secondaryEmotion = emotion;
        break;
      }
    }
    if (Math.abs(primaryEmotion.score - secondaryEmotion.score) > emotionDistThreshold) {
      return primaryEmotion.name;
    }
    return `${secondaryDescriptor} ${primaryEmotion.name}`;
  }


  let startTimestamp: number;
  const emotionsRef = useRef(emotions);
  const intervalIdRef = useRef();

  useEffect(() => {
    emotionsRef.current = emotions;
  }, [emotions]);

  function handleStartStop() {

    if (recording) {
      clearInterval(intervalIdRef.current);
      handleDownloadData();
    } else {
      startTimestamp = Date.now();
      intervalIdRef.current = setInterval(() => {
        const topEmotions = emotionsRef.current.sort((a, b) => b.score - a.score).slice(0, 3);
        const emotionData = {};
        topEmotions.forEach(emotion => {
          emotionData[emotion.name] = emotion.score;
        });
        const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
        setRecordedData(prevData => [...prevData, { timestamp: elapsedSeconds, ...emotionData }]);
      }, 2000);
    }
    setRecording(!recording);
  }
  

async function handleDownloadData() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('EmotionData');

  const dataToExport = recordedData.map((record) => {
    const emotionData = {};
    emotions.forEach(emotion => {
      emotionData[emotion.name] = Math.round((record[emotion.name] || 0) * 1000) / 1000;
    });
    return { Timestamp: record.timestamp, ...emotionData };
  });

  // Add rows to the worksheet
  worksheet.addRows([Object.keys(dataToExport[0]), ...dataToExport.map(Object.values)]);

  // Make the headings bold and underlined except for the timestamp column
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    if (colNumber !== 1) {
      cell.font = { bold: true, underline: 'single' };
    }
  });

  // Make all the rows and columns fit to data
  worksheet.columns.forEach(column => {
    column.width = column.values.reduce((max, value) => Math.max(max, String(value).length), 0);
  });


// Calculate averages
const columnKeys = Object.keys(dataToExport[0]);
const averages = {};
for (let i = 2; i <= columnKeys.length; i++) {
  const columnKey = columnKeys[i - 1]; // Adjust for 0-indexing
  const nonZeroValues = dataToExport.map(row => Number(row[columnKey] || 0)).filter(value => value !== 0);
  const sum = nonZeroValues.reduce((total, value) => total + value, 0);
  const average = nonZeroValues.length > 0 ? sum / nonZeroValues.length : 0;
  averages[columnKey] = average;
}

// Filter out keys where the average is zero and sort the remaining keys
let sortedKeys = Object.keys(averages)
  .filter(key => averages[key] !== 0)
  .sort((a, b) => averages[b] - averages[a]);

// Create a new worksheet and add the rows in the sorted order
const newWorksheet = workbook.addWorksheet('Sorted Data');
const columnNamesRow = newWorksheet.addRow(sortedKeys);

dataToExport.forEach((row, rowIndex) => {
  const dataRow = newWorksheet.addRow([]);
  sortedKeys.forEach((key, columnIndex) => {
    dataRow.getCell(columnIndex + 1).value = row[key];
   
  });
});

// Add the average row
const averageRow = newWorksheet.addRow([]);
sortedKeys.forEach((key, columnIndex) => {
  averageRow.getCell(columnIndex + 1).value = averages[key];
  averageRow.getCell(columnIndex + 1).font = { bold: true, underline: true };
});

// for word cloud start

sortedKeys = Object.keys(averages).sort((a, b) => averages[b] - averages[a]);
// Calculate the min and max average values
const minAvg = d3.min(Object.values(averages));
const maxAvg = d3.max(Object.values(averages));

// Create a color scale
const colorScale = d3.scaleLinear()
  .domain([0, 1]) // The domain is now [0, 1]
  .range(["green", "red"]);

const words = sortedKeys.map(key => {
  // Normalize the average value
  const normalizedAvg = (averages[key] - minAvg) / (maxAvg - minAvg);

  return {
    text: key,
    size: ((averages[key] - 0.3)* 5000) + 1500,
    color: colorScale(normalizedAvg) // Use the normalized average value
  };
});

// const wordEntries = Object.entries(words).map(([text, size]) => ({ text, size: size * 3000 }));
const layout = cloud()
.size([500, 500])
.words(words)
.padding(5)
.rotate(() => ~~(Math.random() * 2) * 90)
.font("Impact")
.fontSize(d => Math.sqrt(d.size))
.on("end", draw);

function draw(words) {
// Remove any existing SVGs
d3.select("#word-cloud").selectAll("svg").remove();

// Append a new SVG
d3.select("#word-cloud").append("svg")
.attr("width", layout.size()[0])
.attr("height", layout.size()[1])
.append("g")
.attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
.selectAll("text")
.data(words)
.enter().append("text")
.style("font-size", d => d.size + "px")
.style("font-family", "Impact")
.style("fill", d => d.color) 
.attr("text-anchor", "middle")
.attr("transform", d => "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")")
.text(d => d.text);
}

layout.start();

// Convert the word cloud to an image and download it
const node = document.getElementById('word-cloud');
domtoimage.toPng(node)
.then(function (dataUrl) {
const link = document.createElement('a');
link.download = 'word-cloud.png';
link.href = dataUrl;
link.click();
})
.catch(function (error) {
console.error('Error generating word cloud image:', error);
});



// for word cloud end



// Write to blob
const buffer = await workbook.xlsx.writeBuffer();
const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

// Save file in the browser
saveAs(blob, 'emotion_data.xlsx');
}

  return (
    <div className={`${className} flex`}>
      {emotions.length > 0 && (
        <div className="mb-3 flex rounded-full border border-neutral-200 text-sm shadow">
          <div className="flex justify-center rounded-l-full bg-white py-2 px-3 font-medium text-neutral-800"></div>
          <div className="w-48 bg-neutral-800 px-4 py-2 text-center lowercase text-white">
            <span>{createDescription(stableEmotions)}</span>
          </div>
         
          <div className="w-48 bg-neutral-800 px-4 py-2 text-center lowercase text-white" style={{
            backgroundColor:"green",
            marginLeft:"10px",
            borderRadius:"10px"
          }}>



<button 
  style={{ 
    backgroundColor: isStarted ? 'red' : 'green', 
    color: 'white', 
    padding: '10px 20px', 
    border: 'none', 
    borderRadius: '5px', 
    cursor: 'pointer' 
  }} 
  onClick={() => {
    setIsStarted(!isStarted);
    handleStartStop();
    // ... rest of your onClick code
  }}
>
  {isStarted ? 'Stop' : 'Start'}
</button>


          </div>
        </div>
      )}

<div style={{
  width: "1px",
  height: "1px",
  position: "absolute",
  top: "100%",
  left: "50%",
  transform: "translate(-50%, -50%) rotate(-90deg)",
  marginTop: "40px"
}} id="word-cloud"></div>

    </div>
  );
}
