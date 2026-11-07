      *> LOAN-78, one amortization period. Monthly rate = bps / 120000.
      *> Input:  L <balance-cents> <bps> <payment-cents>
      *> Output: <new-balance>|<interest>|<principal>|<status>
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. LOAN78.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE   PIC X(80).
       01  WS-CMD    PIC X(1).
       01  WS-A      PIC X(20).
       01  WS-B      PIC X(20).
       01  WS-C      PIC X(20).
       01  WS-N      PIC S9(5) COMP-3.
       01  WS-I      PIC S9(5) COMP-3.
       01  WS-BAL    PIC S9(13)V99 COMP-3.
       01  WS-BPS    PIC S9(9) COMP-3.
       01  WS-PAY    PIC S9(13)V99 COMP-3.
       01  WS-INT    PIC S9(13)V99 COMP-3.
       01  WS-PRIN   PIC S9(13)V99 COMP-3.
       01  WS-NEW    PIC S9(13)V99 COMP-3.
       01  WS-PROD   PIC S9(24)V99 COMP-3.
       01  WS-QUOT   PIC S9(24) COMP-3.
       01  WS-REM    PIC S9(24)V99 COMP-3.
       01  WS-TWICE  PIC S9(24)V99 COMP-3.
       01  WS-MOD    PIC S9(24) COMP-3.
       01  WS-DIV    PIC S9(9) COMP-3.
       01  WS-STAT   PIC X(12).
       01  WS-OUT1   PIC 9(13)V99.
       01  WS-OUT2   PIC 9(13)V99.
       01  WS-OUT3   PIC 9(13)V99.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-N = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-N
               ACCEPT WS-LINE
               MOVE SPACES TO WS-A WS-B WS-C
               UNSTRING WS-LINE DELIMITED BY ALL SPACE
                   INTO WS-CMD WS-A WS-B WS-C
               PERFORM DO-LOAN
           END-PERFORM
           STOP RUN.

       DO-LOAN.
           COMPUTE WS-BAL = FUNCTION NUMVAL(WS-A)
           COMPUTE WS-BPS = FUNCTION NUMVAL(WS-B)
           COMPUTE WS-PAY = FUNCTION NUMVAL(WS-C)
           COMPUTE WS-PROD = WS-BAL * WS-BPS
           MOVE 120000 TO WS-DIV
           PERFORM ROUND-EVEN
           COMPUTE WS-INT = WS-QUOT
           COMPUTE WS-PRIN = WS-PAY - WS-INT
           MOVE "OK" TO WS-STAT
           MOVE WS-BAL TO WS-NEW
           IF WS-PRIN <= 0
               MOVE "NEG_AMORT" TO WS-STAT
               MOVE 0 TO WS-PRIN
           ELSE
               IF WS-PRIN >= WS-BAL
                   MOVE "PAID" TO WS-STAT
                   MOVE WS-BAL TO WS-PRIN
                   MOVE 0 TO WS-NEW
               ELSE
                   COMPUTE WS-NEW = WS-BAL - WS-PRIN
               END-IF
           END-IF
           MOVE WS-NEW  TO WS-OUT1
           MOVE WS-INT  TO WS-OUT2
           MOVE WS-PRIN TO WS-OUT3
           DISPLAY WS-OUT1 "|" WS-OUT2 "|" WS-OUT3 "|" FUNCTION TRIM(WS-STAT).

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
