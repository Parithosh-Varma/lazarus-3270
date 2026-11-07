      *> TELCO-79 call rating in six-second units.
      *> Input:  C <seconds> <rate-per-minute-cents> <fee-cents>
      *> Output: <units>|<cost>|<status>
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. TELCO79.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE   PIC X(80).
       01  WS-CMD    PIC X(1).
       01  WS-A      PIC X(20).
       01  WS-B      PIC X(20).
       01  WS-C      PIC X(20).
       01  WS-N      PIC S9(5) COMP-3.
       01  WS-I      PIC S9(5) COMP-3.
       01  WS-SEC    PIC S9(9) COMP-3.
       01  WS-RATE   PIC S9(13)V99 COMP-3.
       01  WS-FEE    PIC S9(13)V99 COMP-3.
       01  WS-UNITS  PIC S9(9) COMP-3.
       01  WS-COST   PIC S9(13)V99 COMP-3.
       01  WS-PROD   PIC S9(24)V99 COMP-3.
       01  WS-QUOT   PIC S9(24) COMP-3.
       01  WS-REM    PIC S9(24)V99 COMP-3.
       01  WS-TWICE  PIC S9(24)V99 COMP-3.
       01  WS-MOD    PIC S9(24) COMP-3.
       01  WS-DIV    PIC S9(9) COMP-3.
       01  WS-STAT   PIC X(12).
       01  WS-OUT1   PIC 9(13)V99.
       01  WS-OUT2   PIC 9(13)V99.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-N = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-N
               ACCEPT WS-LINE
               MOVE SPACES TO WS-A WS-B WS-C
               UNSTRING WS-LINE DELIMITED BY ALL SPACE
                   INTO WS-CMD WS-A WS-B WS-C
               PERFORM DO-TELCO
           END-PERFORM
           STOP RUN.

       DO-TELCO.
           COMPUTE WS-SEC  = FUNCTION NUMVAL(WS-A)
           COMPUTE WS-RATE = FUNCTION NUMVAL(WS-B)
           COMPUTE WS-FEE  = FUNCTION NUMVAL(WS-C)
           MOVE "OK" TO WS-STAT
           MOVE 0 TO WS-UNITS WS-COST
           IF WS-SEC = 0
               MOVE "NO_CALL" TO WS-STAT
           ELSE
      *>        ceiling division: (seconds + 5) / 6
               COMPUTE WS-UNITS = (WS-SEC + 5) / 6
               COMPUTE WS-PROD = WS-UNITS * WS-RATE
               MOVE 10 TO WS-DIV
               PERFORM ROUND-EVEN
               COMPUTE WS-COST = WS-QUOT + WS-FEE
           END-IF
           MOVE WS-UNITS TO WS-OUT1
           MOVE WS-COST  TO WS-OUT2
           DISPLAY WS-OUT1 "|" WS-OUT2 "|" FUNCTION TRIM(WS-STAT).

       ROUND-EVEN.
           COMPUTE WS-QUOT = WS-PROD / WS-DIV
           COMPUTE WS-REM = WS-PROD - WS-QUOT * WS-DIV
           COMPUTE WS-TWICE = WS-REM * 2
           IF WS-TWICE > WS-DIV
               ADD 1 TO WS-QUOT
           ELSE
               IF WS-TWICE = WS-DIV
                   COMPUTE WS-MOD = FUNCTION MOD(WS-QUOT, 2)
                   IF WS-MOD NOT = 0
                       ADD 1 TO WS-QUOT
                   END-IF
               END-IF
           END-IF.
