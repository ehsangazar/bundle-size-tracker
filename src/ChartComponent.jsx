import React, { useEffect, useState } from "react";
import Select from "react-select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from "recharts";
import { Container, Paper, Typography, TextField, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles({
  container: {
    padding: "2rem",
  },
  paper: {
    padding: "1rem",
    marginBottom: "1rem",
  },
  chartContainer: {
    marginTop: "2rem",
    height: "500px",
  },
  formControl: {
    minWidth: 200,
    marginBottom: "1rem",
  },
  label: {
    marginBottom: "0.5rem",
  },
});

const BundleSizesChart = () => {
  const classes = useStyles();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApps, setSelectedApps] = useState([]);
  const [recordLimit, setRecordLimit] = useState(10);

  const fetchData = async () => {
    try {
      const response = await fetch("/analyser");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();

      // Ensure result is an array and contains valid objects
      if (!Array.isArray(result)) {
        throw new Error("Invalid data format: expected an array");
      }

      const formattedData = result.map((entry) => {
        // Make sure entry and entry.sizes are defined
        if (!entry || !entry.sizes) {
          return {}; // or handle the error accordingly
        }

        return {
          timestamp: entry.date,
          content: {
            ...Object.fromEntries(
              Object.entries(entry.sizes).map(([key, value]) => [
                key,
                parseFloat(value.replace(" KB", "")),
              ])
            ),
          },
        };
      });
      setData(formattedData);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchNewData({ callFetchData: false });
  }, []);

  const fetchNewData = async ({ callFetchData }) => {
    try {
      await fetch("/bundle");
      if (callFetchData) fetchData();
    } catch (error) {
      setError(error);
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography color="error">Error: {error.message}</Typography>;

  // Extract app names from the data
  const apps = data.length > 0 ? Object.keys(data[0].content) : [];

  // Convert app names to options for react-select
  const appOptions = apps.map((app) => ({ value: app, label: app }));

  // Handle app selection
  const handleAppChange = (selectedOptions) => {
    setSelectedApps(selectedOptions.map((option) => option.value));
  };

  // Handle record limit change
  const handleRecordLimitChange = (event) => {
    setRecordLimit(Number(event.target.value));
  };

  // Process data for chart
  const chartData = data
    .slice(0, recordLimit) // Limit number of records
    .map((entry) => {
      if (!entry || !entry.content || !entry.timestamp) {
        return {}; // Skip if entry is not valid
      }

      const formattedData = { timestamp: entry.timestamp };
      selectedApps.forEach((app) => {
        console.log("debug app", app);
        console.log("debug entry[app]", entry[app]);
        if (entry.content[app] !== undefined) {
          formattedData[app] = entry.content[app];
        }
      });
      return formattedData;
    })
    .filter((entry) => Object.keys(entry).length > 1); // Filter out entries with no data

  // Define colors for the lines
  const lineColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#d84a2b"];

  console.log("debug data", data);
  console.log("debug chartData", chartData);
  console.log("debug selectedApps", selectedApps);

  return (
    <Container className={classes.container}>
      <Paper className={classes.paper}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => fetchNewData({ callFetchData: true })}
          style={{ marginBottom: "1rem", width: "100%" }}
        >
          Fetch New Data,
        </Button>
        <Typography variant="p">
          Potentially in future we can link this to the pipeline
        </Typography>
      </Paper>

      <Paper className={classes.paper}>
        <Typography variant="h6" className={classes.label}>
          Select Apps
        </Typography>
        <Select
          isMulti
          options={appOptions}
          onChange={handleAppChange}
          placeholder="Select apps..."
          styles={{
            container: (provided) => ({
              ...provided,
              marginBottom: "1rem",
            }),
            menu: (provided) => ({
              ...provided,
              zIndex: 9999,
            }),
          }}
        />
      </Paper>

      <Paper className={classes.paper}>
        <Typography variant="h6" className={classes.label}>
          Number of Records
        </Typography>
        <TextField
          type="number"
          value={recordLimit}
          onChange={handleRecordLimitChange}
          variant="outlined"
          fullWidth
        />
      </Paper>

      <Paper className={classes.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis>
              <Label value="KB" position="insideLeft" angle={-90} dy={-10} />
            </YAxis>
            <Tooltip />
            <Legend />
            {selectedApps.map((app, index) => (
              <Line
                key={app}
                type="monotone"
                dataKey={app}
                stroke={lineColors[index % lineColors.length]} // Assign color
                strokeWidth={3} // Make the line thicker
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Container>
  );
};

export default BundleSizesChart;
