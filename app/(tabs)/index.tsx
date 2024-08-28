import {
  Image,
  StyleSheet,
  Platform,
  View,
  ScrollView,
  Text,
  Dimensions,
  TouchableOpacity,
  Pressable,
  TextInput,
  NativeSyntheticEvent,
  Modal,
  Button,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
// https://icons.expo.fyi/Index  <= expo/vector에서 기본으로 제공하는 아이콘
import { Fontisto, Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
console.log(width + "_" + height);

export default function HomeScreen() {
  const API_KEY = "f3614eb5ac373025c289c20fcca9c9b5";

  const [location, setLocation] = useState<string | null>();
  const [ok, setOk] = useState(true);
  const [day, setDays] = useState<any[]>([]);
  const [textInputValue, setTextInputValue] = useState("");
  const [toDos, setToDos] = useState<any[]>([]);
  const [popup, setPopup] = useState(false);
  const [modalData, setModalData] = useState<any>();
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    foreground();
  }, []);

  const foreground = async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync(); // 권한승인

    if (!granted) {
      setOk(false);
      return;
    }

    const {
      coords: { latitude, longitude },
    } = await Location.getCurrentPositionAsync(); // 현재위치
    const location = await Location.reverseGeocodeAsync(
      {
        latitude,
        longitude,
      }
      // { useGoogleMaps: true }
      // SDK 이슈로 사용불가
    );
    setLocation(location[0]?.formattedAddress);
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );
    const json = await response.json();
    if (json.cod === "200") {
      const filterData = json.list.filter((weather: any) => {
        if (weather.dt_txt.includes("03:00:00")) {
          return weather;
        }
      });
      // console.log(filterData);
      setDays(filterData);
    }
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const numberOfPages = day?.length || 1; // Adjust according to the number of pages

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollViewRef.current) {
        const nextPage = (currentPage + 1) % numberOfPages;
        scrollViewRef.current.scrollTo({
          x: nextPage * pageWidth,
          animated: true,
        });
        setCurrentPage(nextPage);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPage, pageWidth, numberOfPages]);

  const onLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setPageWidth(width);
  };

  const addToDo = (event: NativeSyntheticEvent<any>) => {
    const text = event?.nativeEvent?.text || "";
    if (text !== "") {
      const data = [
        ...toDos,
        { key: Date.now().toString(), text: text, work: "working" },
      ];
      setToDos(data);
      saveToDos(data);
      setTextInputValue("");
    }
  };

  const saveToDos = async (data: any[]) => {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem("my-key", jsonValue);
    } catch (e) {
      console.log(e);
    }
  };

  const getToDos = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("my-key");
      if (jsonValue != null) {
        const value = JSON.parse(jsonValue);
        setToDos(value);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const removeToDos = async (key: string) => {
    const filterToDos = toDos.filter((data) => {
      if (data.key !== key) {
        return data;
      }
    });
    setToDos(filterToDos);
    saveToDos(filterToDos);
    setPopup(false);
  };

  //
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={camera.container}>
        <Text style={camera.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  return (
    <View>
      <StatusBar style="auto" />
      <View style={{ width: "100%" }}>
        {/* 자식 컴포넌트만 제어함 */}
        <Pressable style={styles.upper}>
          {({ pressed }) => (
            <Text style={styles.upperText}>
              {pressed ? "Pressed!" : `${location}`}
            </Text>
          )}
        </Pressable>
        <ScrollView
          pagingEnabled
          horizontal
          style={styles.lower}
          ref={scrollViewRef}
          onLayout={onLayout}
        >
          {day.length > 0 &&
            day.map((item, index) => (
              <View key={index} style={styles.lowerView}>
                <Text style={styles.lowerText}>
                  {moment(item.dt_txt, "YYYY-MM-DD HH:mm:ss").format("MM/DD")}
                </Text>
                <Text style={styles.upperText}>
                  {item.weather[0].description}
                </Text>
                <Fontisto
                  style={styles.imoticion}
                  name="cloudy"
                  size={40}
                  color="white"
                />
              </View>
            ))}
        </ScrollView>
        <View style={styles.todoView}>
          <Text style={styles.todoText}>Your Todo List ({toDos.length})</Text>
          <TextInput
            style={styles.todoTextInput}
            returnKeyType="send"
            placeholder="What do you have Today?"
            value={textInputValue}
            onChange={(v: any) => setTextInputValue(v.target.value)}
            onSubmitEditing={addToDo}
          />
          <ScrollView style={styles.todoBox}>
            {toDos.length > 0 ? (
              toDos.map((item, index) => (
                <TouchableOpacity
                  onPress={() => {}}
                  onLongPress={() => {
                    setPopup(true);
                    setModalData(item);
                  }}
                  activeOpacity={0.5}
                  key={item.key}
                >
                  <Text style={styles.todoBoxText}>
                    {index + 1}
                    {"  "}({moment(parseInt(item.key, 10)).format("MM/DD")}){" "}
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <>
                <Text style={{ color: "white" }}>리스트가 없어요</Text>
                <Text style={styles.todoBoxText} onPress={getToDos}>
                  저장한 리스트 불러오기
                </Text>
              </>
            )}
          </ScrollView>
          {/* ======================================================== */}
          {/* =========================  모달   ====================== */}
          {/* ======================================================== */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={popup}
            onRequestClose={() => {
              setPopup(!popup);
            }}
          >
            <View style={modal.modalBackground}>
              <View style={modal.modalContainer}>
                <Text style={modal.modalTitle}>
                  {modalData && (
                    <>
                      ({moment(parseInt(modalData.key, 10)).format("MM/DD")}){" "}
                      {modalData?.text}
                    </>
                  )}
                </Text>
                <Text style={modal.modalContent}>
                  <View style={camera.container}>
                    <CameraView
                      style={camera.camera}
                      facing={facing}
                      onCameraReady={() => {}}
                    >
                      <View style={camera.buttonContainer}>
                        <TouchableOpacity
                          style={camera.button}
                          onPress={toggleCameraFacing}
                        >
                          <Text style={camera.text}>Flip Camera</Text>
                        </TouchableOpacity>
                      </View>
                    </CameraView>
                  </View>
                </Text>
                <TouchableOpacity
                  style={modal.removeButton}
                  onPress={() => removeToDos(modalData.key)}
                  activeOpacity={1}
                >
                  <Text style={{ color: "white" }}>삭제하기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modal.button}
                  onPress={() => setPopup(false)}
                  activeOpacity={1}
                >
                  <Text style={modal.buttonText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upper: {
    height: 120,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  upperText: {
    maxWidth: 350,
    fontSize: 30,
    color: "white",
  },
  lower: {
    height: 180,
    backgroundColor: "black",
  },
  lowerView: {
    width: width,
    alignItems: "center",
    backgroundColor: "black",
  },
  lowerText: {
    fontSize: 60,
    color: "white",
  },
  imoticion: {
    marginTop: 15,
  },
  todoView: {
    height: 500,
    backgroundColor: "black",
    paddingLeft: 30,
  },
  todoText: {
    fontSize: 25,
    color: "white",
    marginBottom: 10,
    marginLeft: 15,
    marginTop: 80,
  },
  todoTextInput: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 100,
    width: 300,
  },
  todoBox: {
    width: 330,
    maxHeight: 220,
    marginTop: 20,
  },
  todoBoxText: {
    fontSize: 25,
    color: "white",
    backgroundColor: "#707070",
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
  },
});

const modal = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    width: "80%",
    padding: 20,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5, // For Android shadow
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalContent: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "black",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: "#707070",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
  },
});

const camera = StyleSheet.create({
  container: {
    width: "100%",
    height: 250,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
});
