package com.tmnhat.sprintsservice.controller;

import com.tmnhat.common.payload.ResponseDataAPI;
import com.tmnhat.sprintsservice.model.Sprints;
import com.tmnhat.sprintsservice.service.Impl.SprintServiceImpl;
import com.tmnhat.sprintsservice.service.SprintService;
import com.tmnhat.sprintsservice.validation.SprintValidator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/sprints")
public class SprintController {

    private final SprintService sprintsService;

    public SprintController() {
        this.sprintsService = new SprintServiceImpl();
    }

    @PostMapping
    public ResponseEntity<ResponseDataAPI> addSprint(@RequestBody Sprints sprint) {
        SprintValidator.validateSprint(sprint);
        sprintsService.addSprint(sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @GetMapping
    public ResponseEntity<ResponseDataAPI> getAllSprints() {
        List<Sprints> sprintList = sprintsService.getAllSprints();
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprintList));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> getSprintById(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        Sprints sprint = sprintsService.getSprintById(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMeta(sprint));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> updateSprint(@PathVariable("id") UUID id, @RequestBody Sprints sprint) {
        SprintValidator.validateSprintId(id);
        SprintValidator.validateSprint(sprint);
        sprintsService.updateSprint(id, sprint);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDataAPI> deleteSprint(@PathVariable("id") UUID id) {
        SprintValidator.validateSprintId(id);
        sprintsService.deleteSprint(id);
        return ResponseEntity.ok(ResponseDataAPI.successWithoutMetaAndData());
    }
}
