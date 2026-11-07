      *> METER-78 tiered utility billing at half-cent rates.
      *> Input:  M <kwh>
      *> Output: <bill>|<tier1>|<tier2>|<tier3>
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. METER78.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE   PIC X(80).
       01  WS-CMD    PIC X(1).
       01  WS-A      PIC X(20).
       01  WS-N      PIC S9(5) COMP-3.
       01  WS-I      PIC S9(5) COMP-3.
       01  WS-KWH    PIC S9(9) COMP-3.
       01  WS-REST   PIC S9(9) COMP-3.
       01  WS-T1     PIC S9(9) COMP-3.
       01  WS-T2     PIC S9(9) COMP-3.
       01  WS-T3     PIC S9(9) COMP-3.
       01  WS-COUNT  PIC S9(9) COMP-3.
       01  WS-RATE10 PIC S9(5) COMP-3.
       01  WS-BILL   PIC S9(13)V99 COMP-3.
       01  WS-PROD   PIC S9(24)V99 COMP-3.
       01  WS-QUOT   PIC S9(24) COMP-3.
       01  WS-REM    PIC S9(24)V99 COMP-3.
       01  WS-TWICE  PIC S9(24)V99 COMP-3.
       01  WS-MOD    PIC S9(24) COMP-3.
       01  WS-DIV    PIC S9(9) COMP-3.
       01  WS-OUT1   PIC 9(13)V99.
       01  WS-OUT2   PIC 9(13)V99.
       01  WS-OUT3   PIC 9(13)V99.
       01  WS-OUT4   PIC 9(13)V99.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-N = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-N
               ACCEPT WS-LINE
               MOVE SPACES TO WS-A
               UNSTRING WS-LINE DELIMITED BY ALL SPACE INTO WS-CMD WS-A
               PERFORM DO-METER
           END-PERFORM
           STOP RUN.

       DO-METER.
           COMPUTE WS-KWH = FUNCTION NUMVAL(WS-A)
           MOVE 0 TO WS-T1 WS-T2 WS-T3 WS-BILL
           IF WS-KWH > 100
               MOVE 100 TO WS-T1
               COMPUTE WS-REST = WS-KWH - 100
               IF WS-REST > 150
                   MOVE 150 TO WS-T2
                   COMPUTE WS-T3 = WS-REST - 150
               ELSE
                   MOVE WS-REST TO WS-T2
               END-IF
           ELSE
               MOVE WS-KWH TO WS-T1
           END-IF

           MOVE WS-T1 TO WS-COUNT
           MOVE 125 TO WS-RATE10
           PERFORM ADD-TIER
           MOVE WS-T2 TO WS-COUNT
           MOVE 180 TO WS-RATE10
           PERFORM ADD-TIER
           MOVE WS-T3 TO WS-COUNT
           MOVE 240 TO WS-RATE10
           PERFORM ADD-TIER

           MOVE WS-BILL TO WS-OUT1
           MOVE WS-T1   TO WS-OUT2
           MOVE WS-T2   TO WS-OUT3
           MOVE WS-T3   TO WS-OUT4
           DISPLAY WS-OUT1 "|" WS-OUT2 "|" WS-OUT3 "|" WS-OUT4.

       ADD-TIER.
           COMPUTE WS-PROD = WS-COUNT * WS-RATE10
           MOVE 10 TO WS-DIV
           PERFORM ROUND-EVEN
           COMPUTE WS-BILL = WS-BILL + WS-QUOT.

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
