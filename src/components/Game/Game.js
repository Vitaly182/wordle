import { useState, useEffect } from "react";
import { Text, View, ScrollView, Alert, ActivityIndicator } from "react-native";
import { colors, ENTER, CLEAR, colorsToEmoji } from "../../constants";
import Keyboard from "../Keyboard/Keyboard";
import * as Clipboard from "expo-clipboard";
import words from "../../data/words";
import styles from './Game.styles'
import {copyArray, getDayOfTheYear, getDayKey} from '../../utils'
import AsyncStorage from "@react-native-async-storage/async-storage";
import EndScreen from "../EndScreen";


const NUMBER_OF_TRIES = 7;

const dayOfTheYear = getDayOfTheYear();
const dayKey = getDayKey();

const Game = () => {
  // AsyncStorage.removeItem("@game")
  const word = words[dayOfTheYear];
  const letters = word.split("");

  const [rows, setRows] = useState(
    new Array(NUMBER_OF_TRIES).fill(new Array(letters.length).fill(""))
  );

  const [curRow, setCurRow] = useState(0);
  const [curCol, setCurCol] = useState(0);
  const [gameState, setGameState] = useState("playing");
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (curRow > 0) {
      checkGameState();
    }
  }, [curRow]);

  useEffect(() => {
    if (loaded) {
      persistState();
    }
  }, [rows, curRow, curCol, gameState,])

  useEffect(() => {
    readState();
  }, [])

  const persistState = async () => {
    const dataForToday = {
      rows, 
      curRow,
      curCol,
      gameState,
    };
    try {
      let existingStateString = await AsyncStorage.getItem("@game");
      const existingState = existingStateString 
        ? JSON.parse(existingStateString) 
        : {};

      existingState[dayKey] = dataForToday
      const dataString = JSON.stringify(existingState);
      await AsyncStorage.setItem('@game', dataString);
    } catch(e) {
      console.log("Failed to write data to AsyncStorage", e);
    }
  }

  const readState = async () => {
    const dataString = await AsyncStorage.getItem("@game");
    try {
      const data = JSON.parse(dataString);
      const day = data[dayKey];
      setRows(day.rows);
      setCurRow(day.curRow);
      setCurCol(day.curCol);
      setGameState(day.gameState);
    } catch(e) {
      console.log("Couldn't parse the State")
    }
    setLoaded(true);
  }

  const checkGameState = () => {
    if (checkIfWon() && gameState !== "won") {
      Alert.alert("Huraaay", "You won !!!", [
        { text: "Share", onPress: shareScore },
      ]);
      setGameState("won");
    } else if (checkIfLost() && gameState !== "lost") {
      Alert.alert("Oh", "Try again tomorrow");
      setGameState("lost");
    }
  };

  const shareScore = () => {
    const textMap = rows
      .map((row, i) =>
        row.map((cell, j) => colorsToEmoji[getCellBGColor(i, j)]).join("")
      )
      .filter((row) => row)
      .join("\n");

    const textToShare = `Wordle \n${textMap}`;
    Clipboard.setStringAsync(textToShare);
    Alert.alert(
      "Your score copied successfully",
      "Share your score on your social media"
    );
  };

  const checkIfWon = () => {
    const row = rows[curRow - 1];
    return row.every((letter, i) => letter === letters[i]);
  };

  const checkIfLost = () => {
    return !checkIfWon() && curRow === rows.length;
  };

  const onKeyPressed = (key) => {
    if (gameState !== "playing") {
      return;
    }
    const updatedRows = copyArray(rows);

    if (key === CLEAR) {
      const prevCol = curCol - 1;
      if (prevCol >= 0) {
        updatedRows[curRow][prevCol] = "";
        setRows(updatedRows);
        setCurCol(prevCol);
      }
      return;
    }

    if (key === ENTER) {
      if (curCol === rows[0].length) {
        setCurRow(curRow + 1);
        setCurCol(0);
      }
      return;
    }

    if (curCol < rows[0].length) {
      updatedRows[curRow][curCol] = key;
      setRows(updatedRows);
      setCurCol(curCol + 1);
    }
  };

  const isCellActive = (row, col) => {
    return row === curRow && col === curCol;
  };

  const getCellBGColor = (row, col) => {
    const letter = rows[row][col];
    if (row >= curRow) {
      return colors.black;
    }
    if (letter === letters[col]) {
      return colors.primary;
    }
    if (letters.includes(letter)) {
      return colors.secondary;
    }
    return colors.darkgrey;
  };

  const getAllLettersWithColor = (color) => {
    return rows.flatMap((row, i) =>
      row.filter((cell, j) => getCellBGColor(i, j) === color)
    );
  };

  const greenCaps = getAllLettersWithColor(colors.primary);
  const yellowCaps = getAllLettersWithColor(colors.secondary);
  const greyCaps = getAllLettersWithColor(colors.darkgrey);

  if(!loaded) {
    return(<ActivityIndicator/>)
  }

  if (gameState !== 'playing') {
    return (<EndScreen won={gameState==='won'} />)
  }

  return (
    <>
      <ScrollView style={styles.map}>
        {rows.map((row, i) => (
          <View style={styles.row} key={`row-${i}`}>
            {row.map((letter, j) => (
              <View
                style={[
                  styles.cell,
                  {
                    borderColor: isCellActive(i, j)
                      ? colors.lightgrey
                      : colors.grey,
                    backgroundColor: getCellBGColor(i, j),
                  },
                ]}
                key={`cell-${i}-${j}`}
              >
                <Text style={styles.cellText}>{letter.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <Keyboard
        onKeyPressed={onKeyPressed}
        greenCaps={greenCaps}
        yellowCaps={yellowCaps}
        greyCaps={greyCaps}
      />
    </>
  );
};


export default Game;
