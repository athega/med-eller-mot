import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entypo } from "@expo/vector-icons";

import * as Location from "expo-location";

interface SmhiParameter {
  name: string;
  unit: string;
  values: number[];
}

interface SmhiHour {
  validTime: string;
  parameters: SmhiParameter[];
}

const fetchController = new AbortController();

const WindData = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [heading, setHeading] = useState<number>(0);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hourData, setHourData] = useState<SmhiHour | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      console.log("Got location", location);
      setLocation(location);
    })();

    Location.watchHeadingAsync((loc) => {
      setHeading(loc.magHeading);
    });
  }, []);

  const getSmhiParameterValue = (name: string) =>
    hourData?.parameters.find((hour) => hour.name === name);

  const getWeatherData = async () => {
    const lon = location?.coords.longitude.toFixed(6);
    const lat = location?.coords.latitude.toFixed(6);
    const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;
    const timeoutId = setTimeout(() => {
      console.error("Timed out out after 3s");
      setError("Timed out out after 3s");
      fetchController.abort();
    }, 3000);

    try {
      console.log("Going to fetch", url);
      const response = await fetch(url, { signal: fetchController.signal });
      const json = await response.json();
      console.log("Fetched weather data with", json.approvedTime);
      setHourData(json.timeSeries[0]);
    } catch (error) {
      console.error(error);
      setError(`Kunde inte ladda: ${url}`);
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (location) {
      getWeatherData();
    }
  }, [location]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Åh nej! {error}</Text>
      </View>
    );
  }

  const arrowHeading =
    (getSmhiParameterValue("wd")?.values[0] || 0) - heading + 180;

  return (
    <View style={styles.container}>
      {isLoading && <Text>Laddar väderdata</Text>}
      {!isLoading && (
        <>
          <Entypo
            name="arrow-long-up"
            size={160}
            color="black"
            style={[
              styles.windDirection,
              {
                color: `hsl(${Math.abs(90 - arrowHeading / 2)}, 100%, 40%)`,
                transform: [
                  {
                    rotate: `${
                      (getSmhiParameterValue("wd")?.values[0] || 0) -
                      heading +
                      180
                    }deg`,
                  },
                ],
              },
            ]}
          />
          <Text>
            Vindhastighet:{" "}
            <Text style={styles.unit}>
              {getSmhiParameterValue("ws")?.values[0]}{" "}
              {getSmhiParameterValue("ws")?.unit}
            </Text>
          </Text>
          <Text>
            Vindriktning:
            <Text style={styles.unit}>
              {getSmhiParameterValue("wd")?.values[0]}{" "}
              {getSmhiParameterValue("wd")?.unit}
            </Text>
          </Text>
        </>
      )}
    </View>
  );
};

export default WindData;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  unit: {
    fontSize: 36,
    fontWeight: "bold",
  },
  error: {
    color: "#c00",
    fontWeight: "bold",
  },
  windDirection: {
    marginBottom: 30,
  },
});
