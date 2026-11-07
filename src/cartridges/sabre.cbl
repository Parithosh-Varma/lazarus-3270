      *> SABRE-83 seat inventory. Money and seat counts are integers.
      *> Input:  S <seats> <requested> <fare-cents> <class Y|J|F>
      *> Output: <seats>|<status>|<fare-cents>
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. SABRE83.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE   PIC X(80).
       01  WS-CMD    PIC X(1).
       01  WS-A      PIC X(20).
       01  WS-B      PIC X(20).
       01  WS-C      PIC X(20).
       01  WS-D      PIC X(20).
       01  WS-N      PIC S9(5) COMP-3.
       01  WS-I      PIC S9(5) COMP-3.
       01  WS-SEATS  PIC S9(9) COMP-3.
       01  WS-REQ    PIC S9(9) COMP-3.
       01  WS-FARE   PIC S9(13)V99 COMP-3.
       01  WS-MULT   PIC S9(5) COMP-3.
       01  WS-PROD   PIC S9(24)V99 COMP-3.
       01  WS-QUOT   PIC S9(24) COMP-3.
       01  WS-REM    PIC S9(24)V99 COMP-3.
       01  WS-TWICE  PIC S9(24)V99 COMP-3.
       01  WS-MOD    PIC S9(24) COMP-3.
       01  WS-DIV    PIC S9(9) COMP-3.
       01  WS-STAT   PIC X(16).
       01  WS-OUT    PIC 9(13)V99.
       01  WS-OUT2   PIC 9(13)V99.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-N = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-N
               ACCEPT WS-LINE
               MOVE SPACES TO WS-A WS-B WS-C WS-D
               UNSTRING WS-LINE DELIMITED BY ALL SPACE
                   INTO WS-CMD WS-A WS-B WS-C WS-D
               PERFORM DO-SABRE
           END-PERFORM
           STOP RUN.

       DO-SABRE.
           COMPUTE WS-SEATS = FUNCTION NUMVAL(WS-A)
           COMPUTE WS-REQ   = FUNCTION NUMVAL(WS-B)
           COMPUTE WS-FARE  = FUNCTION NUMVAL(WS-C)
           MOVE "CONFIRMED" TO WS-STAT
           EVALUATE WS-D
               WHEN "Y" MOVE 1000 TO WS-MULT
               WHEN "J" MOVE 1500 TO WS-MULT
               WHEN "F" MOVE 2500 TO WS-MULT
               WHEN OTHER
                   MOVE 0 TO WS-MULT
                   MOVE "INVALID_CLASS" TO WS-STAT
           END-EVALUATE
           IF WS-STAT = "CONFIRMED"
               IF WS-REQ <= 0
                   MOVE "INVALID_REQUEST" TO WS-STAT
               ELSE
                   IF WS-REQ > WS-SEATS
                       MOVE "WAITLIST" TO WS-STAT
                   ELSE
                       SUBTRACT WS-REQ FROM WS-SEATS
                   END-IF
               END-IF
           END-IF
           IF WS-STAT = "CONFIRMED"
               COMPUTE WS-PROD = WS-FARE * WS-MULT
               MOVE 1000 TO WS-DIV
               PERFORM ROUND-EVEN
               COMPUTE WS-FARE = WS-QUOT
           ELSE
               MOVE 0 TO WS-FARE
           END-IF
           MOVE WS-SEATS TO WS-OUT
           MOVE WS-FARE  TO WS-OUT2
           DISPLAY WS-OUT "|" FUNCTION TRIM(WS-STAT) "|" WS-OUT2.

      *> Round WS-PROD / WS-DIV half to even into WS-QUOT.
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
